import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoalProgressCalculator } from './goal-progress-calculator';
import { GoalTarget, ActivityOccurrence, RoutineTemplate } from '@/types/routine';
import { GoalProgressEntry } from '@/types/goal-progress';

describe('GoalProgressCalculator Engine', () => {
  describe('Minute-Based Progress Calculations', () => {
    const target30 = 30;

    it('calculates 1-minute progress correctly (3.3%, 29m remaining)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 1);
      expect(res.displayPercentage).toBe(3.3);
      expect(res.remainingMinutes).toBe(29);
      expect(res.isAchieved).toBe(false);
    });

    it('calculates 5-minute progress correctly (16.7%, 25m remaining)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 5);
      expect(res.displayPercentage).toBe(16.7);
      expect(res.remainingMinutes).toBe(25);
      expect(res.isAchieved).toBe(false);
    });

    it('calculates 10-minute progress correctly (33.3%, 20m remaining)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 10);
      expect(res.displayPercentage).toBe(33.3);
      expect(res.remainingMinutes).toBe(20);
      expect(res.isAchieved).toBe(false);
    });

    it('calculates 12-minute progress correctly (40.0%, 18m remaining)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 12);
      expect(res.displayPercentage).toBe(40.0);
      expect(res.remainingMinutes).toBe(18);
      expect(res.isAchieved).toBe(false);
    });

    it('calculates 15-minute progress correctly (50.0%, 15m remaining)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 15);
      expect(res.displayPercentage).toBe(50.0);
      expect(res.remainingMinutes).toBe(15);
      expect(res.isAchieved).toBe(false);
    });

    it('calculates 20-minute progress correctly (66.7%, 10m remaining)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 20);
      expect(res.displayPercentage).toBe(66.7);
      expect(res.remainingMinutes).toBe(10);
      expect(res.isAchieved).toBe(false);
    });

    it('calculates 25-minute progress correctly (83.3%, 5m remaining)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 25);
      expect(res.displayPercentage).toBe(83.3);
      expect(res.remainingMinutes).toBe(5);
      expect(res.isAchieved).toBe(false);
    });

    it('marks exact target complete (30m / 30m -> 100.0%, 0m remaining, isAchieved: true)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 30);
      expect(res.displayPercentage).toBe(100.0);
      expect(res.remainingMinutes).toBe(0);
      expect(res.isAchieved).toBe(true);
      expect(res.isOverTarget).toBe(false);
    });

    it('preserves true actual minutes when over target (35m / 30m -> 100% display, 35m completed)', () => {
      const res = GoalProgressCalculator.calculateProgress(target30, 35);
      expect(res.displayPercentage).toBe(100.0);
      expect(res.completedMinutes).toBe(35);
      expect(res.remainingMinutes).toBe(0);
      expect(res.isAchieved).toBe(true);
      expect(res.isOverTarget).toBe(true);
      expect(res.overTargetMinutes).toBe(5);
    });

    it('handles 8.5-hour target (510 minutes) properly', () => {
      const target510 = 510;
      const res = GoalProgressCalculator.calculateProgress(target510, 255);
      expect(res.displayPercentage).toBe(50.0);
      expect(res.remainingMinutes).toBe(255);
      expect(res.isAchieved).toBe(false);
    });

    it('handles zero or invalid target safely', () => {
      const res = GoalProgressCalculator.calculateProgress(0, 10);
      expect(res.displayPercentage).toBe(0);
      expect(res.remainingMinutes).toBe(0);
      expect(res.isAchieved).toBe(true);
    });
  });

  describe('Goal-Specific Unit Tracking & Conversions', () => {
    it('configures cycling goal with km units and 3.0 min/km pace', () => {
      const config = GoalProgressCalculator.getGoalUnitConfig('goal_cycling_exercise', 'Cycling & Exercise');
      expect(config.primaryUnit).toBe('km');
      expect(config.quickPresets).toContain(15);
      // 15 km = 45 minutes
      expect(config.conversionToMinutes(15)).toBe(45);
    });

    it('configures reading goal with chapters unit and 20 min/ch pace', () => {
      const config = GoalProgressCalculator.getGoalUnitConfig('goal_mindvalley', 'Mindvalley / Reading');
      expect(config.primaryUnit).toBe('chapters');
      expect(config.quickPresets).toContain(1);
      // 1 chapter = 20 minutes
      expect(config.conversionToMinutes(1)).toBe(20);
    });

    it('configures course goal with topics unit and 15 min/topic pace', () => {
      const config = GoalProgressCalculator.getGoalUnitConfig('goal_coursera', 'Coursera');
      expect(config.primaryUnit).toBe('topics');
      expect(config.quickPresets).toContain(1);
      // 2 topics = 30 minutes (exact daily target)
      expect(config.conversionToMinutes(2)).toBe(30);
    });

    it('configures time-based goals with minute units', () => {
      const config = GoalProgressCalculator.getGoalUnitConfig('goal_meditation', 'Meditation');
      expect(config.primaryUnit).toBe('minutes');
      expect(config.quickPresets).toEqual([1, 5, 10, 15, 30]);
    });
  });

  describe('Double-Counting Prevention & Occurrence Aggregation', () => {
    const mockGoal: GoalTarget = {
      id: 'goal_meditation',
      userId: 'user_1',
      title: 'Meditation',
      categories: ['mindfulness'],
      templateIds: ['template_meditation'],
      frequency: 'daily',
      targetMinutes: 30,
      activeDays: [0, 1, 2, 3, 4, 5, 6],
      isArchived: false,
      updatedAt: Date.now(),
    };

    const mockTemplate: RoutineTemplate = {
      id: 'template_meditation',
      userId: 'user_1',
      title: 'Meditation',
      category: 'mindfulness',
      startTime: '06:10',
      endTime: '06:40',
      isFixed: false,
      recurrence: { frequency: 'daily', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-01-01', exceptions: [] },
      notifications: [],
      notes: '',
      color: '#10b981',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const targetDate = '2026-10-24';

    it('correctly sums routine execution minutes and manual progress entries', () => {
      const occurrence: ActivityOccurrence = {
        occurrenceId: 'occ_med_1',
        templateId: 'template_meditation',
        date: targetDate,
        title: 'Meditation',
        category: 'mindfulness',
        startTime: '06:10',
        endTime: '06:40',
        durationMinutes: 30,
        isFixed: false,
        notes: '',
        color: '#10b981',
        notifications: [],
        hasOverride: false,
        isCancelled: false,
        isPostponed: false,
        log: {
          id: `${targetDate}_template_meditation`,
          userId: 'user_1',
          templateId: 'template_meditation',
          date: targetDate,
          status: 'completed',
          actualDurationMinutes: 30,
          targetDurationMinutes: 30,
          completionNotes: '',
          updatedAt: Date.now(),
        },
        template: mockTemplate,
      };

      const manualEntry: GoalProgressEntry = {
        id: 'gpe_1',
        userId: 'user_1',
        goalId: 'goal_meditation',
        date: targetDate,
        minutes: 5,
        unit: 'minutes',
        source: 'manual',
        note: 'Evening breathwork',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const aggregated = GoalProgressCalculator.aggregateGoalMinutes(
        mockGoal,
        [occurrence],
        [manualEntry],
        targetDate
      );

      // 30m from routine + 5m manual = 35m total
      expect(aggregated.routineMinutes).toBe(30);
      expect(aggregated.manualMinutes).toBe(5);
      expect(aggregated.totalCompletedMinutes).toBe(35);
      expect(aggregated.calculation.isAchieved).toBe(true);
      expect(aggregated.calculation.overTargetMinutes).toBe(5);
    });

    it('accumulates manual progress for unscheduled goals (Coursera)', () => {
      const courseraGoal: GoalTarget = {
        id: 'goal_coursera',
        userId: 'user_1',
        title: 'Coursera',
        categories: ['learning'],
        templateIds: [], // unscheduled in routine
        frequency: 'daily',
        targetMinutes: 30,
        activeDays: [0, 1, 2, 3, 4, 5, 6],
        isArchived: false,
        updatedAt: Date.now(),
      };

      const topicEntry: GoalProgressEntry = {
        id: 'gpe_coursera_1',
        userId: 'user_1',
        goalId: 'goal_coursera',
        date: targetDate,
        minutes: 15,
        unit: 'topics',
        unitValue: 1,
        source: 'manual',
        note: 'Completed Chapter 2: Transformers',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const aggregated = GoalProgressCalculator.aggregateGoalMinutes(
        courseraGoal,
        [],
        [topicEntry],
        targetDate
      );

      expect(aggregated.routineMinutes).toBe(0);
      expect(aggregated.manualMinutes).toBe(15);
      expect(aggregated.totalCompletedMinutes).toBe(15);
      expect(aggregated.calculation.displayPercentage).toBe(50.0);
      expect(aggregated.calculation.remainingMinutes).toBe(15);
      expect(aggregated.calculation.isAchieved).toBe(false);
    });
  });

  describe('GoalProgressRepository Offline Operations', () => {
    const testUserId = 'test-progress-user';
    const testDate = '2026-10-24';
    const yesterdayDate = '2026-10-23';

    // Mock localStorage for node test environment
    const storage = new Map<string, string>();
    beforeEach(() => {
      storage.clear();
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => storage.get(k) || null,
        setItem: (k: string, v: string) => storage.set(k, v),
        removeItem: (k: string) => storage.delete(k),
        clear: () => storage.clear(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('saves and retrieves progress entries from local storage', async () => {
      const { GoalProgressRepository } = await import('@/lib/repositories/goal-progress-repository');
      const initial = GoalProgressRepository.getLocalEntries(testUserId);
      expect(initial).toEqual([]);

      const entry: GoalProgressEntry = {
        id: 'entry_1',
        userId: testUserId,
        goalId: 'goal_cycling_exercise',
        date: testDate,
        minutes: 45,
        unit: 'km',
        unitValue: 15,
        source: 'manual',
        note: '15 km morning ride',
        createdAt: 1000,
        updatedAt: 1000,
      };

      await GoalProgressRepository.addEntry(entry);
      const retrieved = GoalProgressRepository.getLocalEntries(testUserId);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].minutes).toBe(45);
      expect(retrieved[0].unitValue).toBe(15);
    });

    it('isolates entries by date (Asia/Kolkata date grouping)', async () => {
      const { GoalProgressRepository } = await import('@/lib/repositories/goal-progress-repository');
      const entryToday: GoalProgressEntry = {
        id: 'entry_today',
        userId: testUserId,
        goalId: 'goal_meditation',
        date: testDate,
        minutes: 10,
        unit: 'minutes',
        source: 'manual',
        note: '',
        createdAt: 2000,
        updatedAt: 2000,
      };
      const entryYesterday: GoalProgressEntry = {
        id: 'entry_yesterday',
        userId: testUserId,
        goalId: 'goal_meditation',
        date: yesterdayDate,
        minutes: 20,
        unit: 'minutes',
        source: 'manual',
        note: '',
        createdAt: 1000,
        updatedAt: 1000,
      };

      await GoalProgressRepository.addEntry(entryToday);
      await GoalProgressRepository.addEntry(entryYesterday);

      const todayEntries = GoalProgressRepository.getEntriesForDate(testUserId, testDate);
      expect(todayEntries.length).toBe(1);
      expect(todayEntries[0].id).toBe('entry_today');

      const yesterdayEntries = GoalProgressRepository.getEntriesForDate(testUserId, yesterdayDate);
      expect(yesterdayEntries.length).toBe(1);
      expect(yesterdayEntries[0].id).toBe('entry_yesterday');
    });

    it('undoes the most recent entry for a specific goal and date', async () => {
      const { GoalProgressRepository } = await import('@/lib/repositories/goal-progress-repository');
      const firstEntry: GoalProgressEntry = {
        id: 'entry_first',
        userId: testUserId,
        goalId: 'goal_coursera',
        date: testDate,
        minutes: 15,
        unit: 'topics',
        unitValue: 1,
        source: 'manual',
        note: 'Topic 1',
        createdAt: 1000,
        updatedAt: 1000,
      };
      const secondEntry: GoalProgressEntry = {
        id: 'entry_second',
        userId: testUserId,
        goalId: 'goal_coursera',
        date: testDate,
        minutes: 15,
        unit: 'topics',
        unitValue: 1,
        source: 'manual',
        note: 'Topic 2',
        createdAt: 2000,
        updatedAt: 2000,
      };

      await GoalProgressRepository.addEntry(firstEntry);
      await GoalProgressRepository.addEntry(secondEntry);

      expect(GoalProgressRepository.getLocalEntries(testUserId).length).toBe(2);

      const undone = await GoalProgressRepository.undoLastEntry(testUserId, 'goal_coursera', testDate);
      expect(undone?.id).toBe('entry_second');

      const remaining = GoalProgressRepository.getLocalEntries(testUserId);
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('entry_first');
    });
  });
});
