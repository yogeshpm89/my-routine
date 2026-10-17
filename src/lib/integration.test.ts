import { describe, it, expect, beforeEach } from 'vitest';
import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { OverrideRepository } from '@/lib/repositories/override-repository';
import { LogRepository } from '@/lib/repositories/log-repository';
import { GoalRepository } from '@/lib/repositories/goal-repository';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { detectScheduleConflicts } from '@/lib/conflict-detector';
import { AnalyticsCalculator } from '@/lib/analytics/analytics-calculator';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { BackupService } from '@/lib/sync/backup-service';
import { getDayOfWeek } from '@/lib/time-utils';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
  GoalTarget,
} from '@/types/routine';

describe('My Routine Full System Integration', () => {
  const testUserId = 'integration-test-user';
  const testDate = '2026-10-15'; // Thursday

  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes seed routine and generates daily occurrences correctly', async () => {
    const templates = await RoutineRepository.getTemplates(testUserId);
    expect(templates.length).toBeGreaterThanOrEqual(20);

    const occurrences = generateDailyOccurrences(templates, [], [], testDate);
    expect(occurrences.length).toBeGreaterThan(0);

    // Verify wakeup block
    const wakeup = occurrences.find((o) => o.title.includes('Wake up'));
    expect(wakeup).toBeDefined();
    expect(wakeup?.startTime).toBe('06:00');

    // Verify Melodyarc IST meeting block
    const istMeeting = occurrences.find((o) => o.title.includes('Melodyarc IST meeting'));
    expect(istMeeting).toBeDefined();
    expect(istMeeting?.startTime).toBe('16:00');
  });

  it('detects schedule conflicts and goal deficits', async () => {
    const templates = await RoutineRepository.getTemplates(testUserId);
    const goals = await GoalRepository.getGoals(testUserId);
    const occurrences = generateDailyOccurrences(templates, [], [], testDate);
    const dow = getDayOfWeek(testDate);

    const conflicts = detectScheduleConflicts(occurrences, goals, dow);

    // Should detect the work goal deficit (420m scheduled vs 510m target)
    const workDeficit = conflicts.find(
      (c) => c.type === 'goal_deficit' && c.goal?.categories.includes('work')
    );
    expect(workDeficit).toBeDefined();
    expect(workDeficit?.severity).toBe('warning');
  });

  it('supports 3-way recurrence edits without corrupting history', async () => {
    const templates = await RoutineRepository.getTemplates(testUserId);
    const recurringBlock = templates.find((t) => t.recurrence.frequency === 'daily')!;
    expect(recurringBlock).toBeDefined();

    // 1. Single occurrence override
    await OverrideRepository.saveOverride({
      id: `override_${recurringBlock.id}_${testDate}`,
      userId: testUserId,
      templateId: recurringBlock.id,
      date: testDate,
      modifiedStartTime: '06:15',
      modifiedEndTime: '06:45',
      modifiedTitle: `${recurringBlock.title} (Delayed)`,
      notes: 'Woke up 15m later',
      isCancelled: false,
      isPostponed: false,
      updatedAt: Date.now(),
    });

    const overrides = await OverrideRepository.getOverridesForDate(testUserId, testDate);
    const occsWithOverride = generateDailyOccurrences(templates, overrides, [], testDate);
    const modifiedOcc = occsWithOverride.find((o) => o.templateId === recurringBlock.id);
    expect(modifiedOcc?.startTime).toBe('06:15');
    expect(modifiedOcc?.title).toContain('(Delayed)');

    // Next day should still reflect original template time (06:00)
    const nextDayOccs = generateDailyOccurrences(templates, overrides, [], '2026-10-16');
    const nextDayOcc = nextDayOccs.find((o) => o.templateId === recurringBlock.id);
    expect(nextDayOcc?.startTime).toBe(recurringBlock.startTime);
  });

  it('computes analytics and goal completion across logged activities', async () => {
    const templates = await RoutineRepository.getTemplates(testUserId);
    const goals = await GoalRepository.getGoals(testUserId);
    let occurrences = generateDailyOccurrences(templates, [], [], testDate);

    // Mark the cycling routine as completed with 135 minutes actual
    const cyclingOcc = occurrences.find((o) => o.title.toLowerCase().includes('cycling'))!;
    expect(cyclingOcc).toBeDefined();

    await LogRepository.updateStatus(testUserId, testDate, cyclingOcc.templateId, 'completed', {
      actualStartTime: '16:30',
      actualEndTime: '18:45',
      actualDurationMinutes: 135,
    });

    const logs = await LogRepository.getLogsForDate(testUserId, testDate);
    occurrences = generateDailyOccurrences(templates, [], logs, testDate);

    const summary = AnalyticsCalculator.computeSummary(
      occurrences,
      goals,
      'day',
      testDate,
      testDate
    );
    expect(summary.totalPlannedMinutes).toBeGreaterThan(0);
    expect(summary.statusCounts.completed).toBeGreaterThanOrEqual(1);

    // Check fitness category metrics (cycling falls in fitness category)
    const fitnessCat = summary.categoryBreakdown.find((c) => c.category === 'fitness');
    expect(fitnessCat).toBeDefined();
    expect(fitnessCat?.actualMinutes).toBeGreaterThanOrEqual(120);

    // Check cycling goal target progress
    const cyclingGoal = summary.goalFulfillments.find((g) =>
      g.goal.title.toLowerCase().includes('cycling')
    );
    expect(cyclingGoal).toBeDefined();
    expect(cyclingGoal?.actualMinutes).toBeGreaterThanOrEqual(120);
    expect(cyclingGoal?.fulfillmentPercentage).toBeGreaterThanOrEqual(100);
  });

  it('queues offline mutations and manages sync replay', () => {
    MutationQueue.enqueue(testUserId, 'templates', 'set', 'custom_task_1', {
      id: 'custom_task_1',
      title: 'Custom Evening Stroll',
    });

    const pending = MutationQueue.getQueue(testUserId);
    expect(pending.length).toBe(1);
    expect(pending[0].docId).toBe('custom_task_1');

    MutationQueue.dequeue(testUserId, pending[0].id);
    expect(MutationQueue.getQueue(testUserId).length).toBe(0);
  });

  it('exports full user data to JSON and restores it reliably', async () => {
    // Populate templates & goals in local storage first
    await RoutineRepository.getTemplates(testUserId);
    await GoalRepository.getGoals(testUserId);

    const backupPackage = BackupService.exportAllData(testUserId);
    expect(backupPackage).toBeDefined();
    expect(backupPackage.version).toBe('1.0');
    expect(backupPackage.templates.length).toBeGreaterThanOrEqual(20);

    const serialized = JSON.stringify(backupPackage);

    // Clear local storage and verify restore
    localStorage.clear();

    const restoreResult = BackupService.importBackupData(testUserId, serialized, 'replace');
    expect(restoreResult.success).toBe(true);

    const restoredTemplates = RoutineRepository.getLocalTemplates(testUserId);
    expect(restoredTemplates.length).toBe(backupPackage.templates.length);
  });

  it('subscribes to real-time routine templates and receives initial data immediately', () => {
    let received: RoutineTemplate[] = [];
    const unsub = RoutineRepository.subscribeTemplates(testUserId, (data) => {
      received = data;
    });
    expect(received.length).toBeGreaterThanOrEqual(20);
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('subscribes to real-time overrides and logs with immediate callbacks', () => {
    let receivedOverrides: OccurrenceOverride[] = [];
    const unsubOverrides = OverrideRepository.subscribeOverrides(testUserId, (data) => {
      receivedOverrides = data;
    });
    expect(Array.isArray(receivedOverrides)).toBe(true);
    expect(typeof unsubOverrides).toBe('function');
    unsubOverrides();

    let receivedLogs: ActivityLog[] = [];
    const unsubLogs = LogRepository.subscribeLogs(testUserId, (data) => {
      receivedLogs = data;
    });
    expect(Array.isArray(receivedLogs)).toBe(true);
    expect(typeof unsubLogs).toBe('function');
    unsubLogs();
  });

  it('subscribes to real-time goals and receives seeded targets', () => {
    let receivedGoals: GoalTarget[] = [];
    const unsubGoals = GoalRepository.subscribeGoals(testUserId, (data) => {
      receivedGoals = data;
    });
    expect(receivedGoals.length).toBeGreaterThanOrEqual(5);
    expect(typeof unsubGoals).toBe('function');
    unsubGoals();
  });
});
