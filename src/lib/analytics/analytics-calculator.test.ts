import { describe, it, expect } from 'vitest';
import { AnalyticsCalculator } from './analytics-calculator';
import { getInitialRoutineTemplates, getInitialGoalTargets } from '@/lib/seed-data';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { ActivityLog } from '@/types/routine';

describe('AnalyticsCalculator Engine', () => {
  const userId = 'test-analytics-user';
  const templates = getInitialRoutineTemplates(userId);
  const goals = getInitialGoalTargets(userId);
  const mondayDate = '2026-10-19';

  it('calculates planned minutes and category breakdown for a scheduled day', () => {
    const occurrences = generateDailyOccurrences(templates, [], [], mondayDate);
    const summary = AnalyticsCalculator.computeSummary(
      occurrences,
      goals,
      'day',
      mondayDate,
      mondayDate
    );

    expect(summary.totalPlannedMinutes).toBeGreaterThan(600);
    expect(summary.categoryBreakdown.length).toBeGreaterThan(4);

    // Work category has 420 minutes (7 hours) in default schedule
    const workCat = summary.categoryBreakdown.find((c) => c.category === 'work');
    expect(workCat).toBeDefined();
    expect(workCat!.plannedMinutes).toBe(420);
  });

  it('computes completion rate and actual duration when activities are logged', () => {
    const occurrences = generateDailyOccurrences(templates, [], [], mondayDate);

    // Mark Meditation completed (30m) and Wake Up completed (10m)
    const logs: ActivityLog[] = [
      {
        id: `${mondayDate}_template_wake_up`,
        userId,
        templateId: 'template_wake_up',
        date: mondayDate,
        status: 'completed',
        actualDurationMinutes: 10,
        targetDurationMinutes: 10,
        completionNotes: '',
        updatedAt: Date.now(),
      },
      {
        id: `${mondayDate}_template_meditation`,
        userId,
        templateId: 'template_meditation',
        date: mondayDate,
        status: 'completed',
        actualDurationMinutes: 30,
        targetDurationMinutes: 30,
        completionNotes: '',
        updatedAt: Date.now(),
      },
    ];

    const occurrencesWithLogs = generateDailyOccurrences(templates, [], logs, mondayDate);
    const summary = AnalyticsCalculator.computeSummary(
      occurrencesWithLogs,
      goals,
      'day',
      mondayDate,
      mondayDate
    );

    expect(summary.statusCounts.completed).toBe(2);
    expect(summary.totalActualMinutes).toBeGreaterThanOrEqual(40);
    expect(summary.completionRate).toBeGreaterThan(0);

    // Meditation goal should be achieved
    const medGoal = summary.goalFulfillments.find((g) => g.goal.id === 'goal_meditation');
    expect(medGoal).toBeDefined();
    expect(medGoal?.status).toBe('achieved');
    expect(medGoal?.fulfillmentPercentage).toBe(100);
  });

  it('correctly classifies unscheduled goals and deficits', () => {
    const occurrences = generateDailyOccurrences(templates, [], [], mondayDate);
    const summary = AnalyticsCalculator.computeSummary(
      occurrences,
      goals,
      'day',
      mondayDate,
      mondayDate
    );

    // Coursera should be unscheduled
    const coursera = summary.goalFulfillments.find((g) => g.goal.id === 'goal_coursera');
    expect(coursera).toBeDefined();
    expect(coursera?.status).toBe('unscheduled');
    expect(coursera?.deficitMinutes).toBe(30);

    // Fullmoon Styles should have deficit (120m target vs 30m scheduled block)
    const fullmoon = summary.goalFulfillments.find((g) => g.goal.id === 'goal_fullmoon_meghmalhaar');
    expect(fullmoon).toBeDefined();
    expect(fullmoon?.status).toBe('under_target');
    expect(fullmoon?.plannedMinutes).toBe(30);
    expect(fullmoon?.targetMinutes).toBe(120);
  });
});
