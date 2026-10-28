import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { RoutineTemplate, OccurrenceOverride, ActivityLog } from '@/types/routine';
import { LifeGoalRepository } from '@/lib/repositories/life-goal-repository';
import { LifeGoal } from '@/types/goals';
import { NotificationManager } from '@/lib/notifications/notification-manager';
import { NotificationPreferences } from '@/types/notifications';
import { AnalyticsCalculator } from '@/lib/analytics/analytics-calculator';

describe('Feature #15: Flexible Routine Block Replacement', () => {
  const userId = 'test-replacement-user';
  const targetDate = '2026-10-28';

  const baseTemplate: RoutineTemplate = {
    id: 'template_deep_work_15',
    userId,
    title: 'Deep Work Architecture',
    category: 'work',
    startTime: '10:00',
    endTime: '12:00',
    isFixed: true,
    recurrence: {
      frequency: 'daily',
      daysOfWeek: [],
      startDate: '2026-10-01',
      exceptions: [],
    },
    notifications: [
      { id: 'notif_1', type: 'advance', offsetMinutes: -10, enabled: true },
      { id: 'notif_2', type: 'start', offsetMinutes: 0, enabled: true },
    ],
    notes: 'Focus on core system architecture',
    color: '#3b82f6',
    timezone: 'Asia/Kolkata',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const defaultPrefs: NotificationPreferences = {
    userId,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
    snoozeDurationMinutes: 10,
    defaultAdvanceReminders: [-10],
    updatedAt: Date.now(),
  };

  const testLifeGoals: LifeGoal[] = [
    {
      id: 'goal_system_mastery',
      userId,
      title: 'Master System Architecture',
      domain: 'professional',
      category: 'career',
      status: 'in_progress',
      startDate: '2026-01-01',
      targetDate: '2026-12-31',
      startValue: 0,
      currentValue: 50,
      targetValue: 100,
      unit: 'sessions',
      progressLogs: [],
      color: '#3b82f6',
      autoTrackFromActivities: true,
      linkedTemplateIds: ['template_deep_work_15'],
      activityRecords: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'goal_emergency_response',
      userId,
      title: 'Site Reliability Engineering',
      domain: 'professional',
      category: 'work',
      status: 'in_progress',
      startDate: '2026-01-01',
      targetDate: '2026-12-31',
      startValue: 0,
      currentValue: 10,
      targetValue: 100,
      unit: 'sessions',
      progressLogs: [],
      color: '#10b981',
      autoTrackFromActivities: true,
      linkedTemplateIds: [],
      activityRecords: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    LifeGoalRepository.saveLocalLifeGoals(userId, testLifeGoals);
  });

  describe('1. Occurrence Generator Replacement Synthesis', () => {
    it('synthesizes original block as replaced and introduces replacement occurrence', () => {
      const override: OccurrenceOverride = {
        id: `override_${baseTemplate.id}_${targetDate}`,
        userId,
        templateId: baseTemplate.id,
        date: targetDate,
        isCancelled: false,
        isPostponed: false,
        isReplaced: true,
        replacementActivity: {
          id: 'adhoc_emergency_call',
          title: 'Emergency Client Incident Call',
          category: 'work',
          startTime: '10:00',
          endTime: '12:00',
          durationMinutes: 120,
          isTemporary: true,
          reason: 'Production outage incident',
        },
        originalActivitySnapshot: {
          title: baseTemplate.title,
          category: baseTemplate.category,
          startTime: baseTemplate.startTime,
          endTime: baseTemplate.endTime,
          durationMinutes: 120,
        },
        updatedAt: Date.now(),
      };

      const occurrences = generateDailyOccurrences([baseTemplate], [override], [], targetDate);

      // Should have 2 occurrences: original replaced block + replacement ad-hoc block
      expect(occurrences.length).toBe(2);

      const originalBlock = occurrences.find((o) => o.templateId === baseTemplate.id);
      expect(originalBlock).toBeDefined();
      expect(originalBlock?.isReplaced).toBe(true);
      expect(originalBlock?.log?.status).toBe('replaced');
      expect(originalBlock?.replacement?.title).toBe('Emergency Client Incident Call');
      expect(originalBlock?.replacementReason).toBe('Production outage incident');

      const replacementBlock = occurrences.find((o) => o.isReplacement);
      expect(replacementBlock).toBeDefined();
      expect(replacementBlock?.title).toBe('Emergency Client Incident Call');
      expect(replacementBlock?.startTime).toBe('10:00');
      expect(replacementBlock?.endTime).toBe('12:00');
      expect(replacementBlock?.replacesTemplateId).toBe(baseTemplate.id);
      expect(replacementBlock?.replacesTitle).toBe(baseTemplate.title);
      expect(replacementBlock?.replacementReason).toBe('Production outage incident');
    });

    it('synthesizes rescheduled occurrence when rescheduleOriginal is specified', () => {
      const override: OccurrenceOverride = {
        id: `override_${baseTemplate.id}_${targetDate}`,
        userId,
        templateId: baseTemplate.id,
        date: targetDate,
        isCancelled: false,
        isPostponed: false,
        isReplaced: true,
        replacementActivity: {
          id: 'adhoc_emergency_call',
          title: 'Emergency Meeting',
          category: 'work',
          startTime: '10:00',
          endTime: '11:00',
          durationMinutes: 60,
          isTemporary: true,
        },
        originalActivitySnapshot: {
          title: baseTemplate.title,
          category: baseTemplate.category,
          startTime: baseTemplate.startTime,
          endTime: baseTemplate.endTime,
          durationMinutes: 120,
        },
        rescheduledTo: {
          date: targetDate,
          startTime: '15:00',
          endTime: '17:00',
        },
        updatedAt: Date.now(),
      };

      const occurrences = generateDailyOccurrences([baseTemplate], [override], [], targetDate);

      // Should have 3 occurrences:
      // 1. Original replaced block (10:00 - 12:00)
      // 2. Replacement block (10:00 - 11:00)
      // 3. Rescheduled block (15:00 - 17:00)
      expect(occurrences.length).toBe(3);

      const rescheduled = occurrences.find((o) => o.isRescheduled);
      expect(rescheduled).toBeDefined();
      expect(rescheduled?.startTime).toBe('15:00');
      expect(rescheduled?.endTime).toBe('17:00');
      expect(rescheduled?.title).toContain('(Rescheduled)');
      expect(rescheduled?.rescheduledFrom?.originalStartTime).toBe('10:00');
      expect(rescheduled?.rescheduledFrom?.originalEndTime).toBe('12:00');
    });

    it('handles partial duration work on original block before replacement', () => {
      const override: OccurrenceOverride = {
        id: `override_${baseTemplate.id}_${targetDate}`,
        userId,
        templateId: baseTemplate.id,
        date: targetDate,
        isCancelled: false,
        isPostponed: false,
        isReplaced: true,
        replacementActivity: {
          id: 'adhoc_urgent_errand',
          title: 'Urgent Family Errand',
          category: 'personal',
          startTime: '10:45',
          endTime: '12:00',
          durationMinutes: 75,
          isTemporary: true,
        },
        originalActivitySnapshot: {
          title: baseTemplate.title,
          category: baseTemplate.category,
          startTime: baseTemplate.startTime,
          endTime: baseTemplate.endTime,
          durationMinutes: 120,
        },
        partialDurationMinutes: 45,
        updatedAt: Date.now(),
      };

      const partialLog: ActivityLog = {
        id: `${targetDate}_${baseTemplate.id}`,
        userId,
        templateId: baseTemplate.id,
        date: targetDate,
        status: 'partial',
        actualDurationMinutes: 45,
        targetDurationMinutes: 120,
        completionNotes: '',
        updatedAt: Date.now(),
      };

      const occurrences = generateDailyOccurrences([baseTemplate], [override], [partialLog], targetDate);
      const originalBlock = occurrences.find((o) => o.templateId === baseTemplate.id);

      expect(originalBlock?.isReplaced).toBe(true);
      expect(originalBlock?.log?.status).toBe('partial');
      expect(originalBlock?.log?.actualDurationMinutes).toBe(45);
    });
  });

  describe('2. Life Goal Isolation (FR-004)', () => {
    it('does not credit original routine goal when replacement activity has no goal link', async () => {
      const updatedGoals = await LifeGoalRepository.syncCompletedRoutineToLifeGoals(
        userId,
        targetDate,
        'repl_tmpl_emergency',
        'Emergency Client Call',
        120,
        'Completed incident response',
        {
          isReplacement: true,
          replacesTemplateId: baseTemplate.id,
          // no linkedGoalId provided
        }
      );

      expect(updatedGoals).toEqual([]);

      // Verify original goal progress did not change
      const goalsAfter = LifeGoalRepository.getLocalLifeGoals(userId);
      const originalGoal = goalsAfter.find((g) => g.id === 'goal_system_mastery');
      expect(originalGoal?.currentValue).toBe(50);
      expect(originalGoal?.activityRecords?.length || 0).toBe(0);
    });

    it('credits only the replacement activity explicit goal link and isolates original goal', async () => {
      const updatedGoals = await LifeGoalRepository.syncCompletedRoutineToLifeGoals(
        userId,
        targetDate,
        'repl_tmpl_emergency',
        'Emergency Incident Response',
        120,
        'Completed incident response',
        {
          isReplacement: true,
          linkedGoalId: 'goal_emergency_response',
          replacesTemplateId: baseTemplate.id,
        }
      );

      // Exactly 1 goal should be updated: goal_emergency_response
      expect(updatedGoals.length).toBe(1);
      expect(updatedGoals[0].id).toBe('goal_emergency_response');

      const goalsAfter = LifeGoalRepository.getLocalLifeGoals(userId);
      const originalGoal = goalsAfter.find((g) => g.id === 'goal_system_mastery');
      const emergencyGoal = goalsAfter.find((g) => g.id === 'goal_emergency_response');

      // Original goal is untouched
      expect(originalGoal?.currentValue).toBe(50);
      expect(originalGoal?.activityRecords?.length || 0).toBe(0);

      // Emergency goal received progress increment (from 10 to 11) and an activity record
      expect(emergencyGoal?.currentValue).toBe(11);
      expect(emergencyGoal?.activityRecords?.length).toBe(1);
      expect(emergencyGoal?.activityRecords?.[0].activityTitle).toBe('Emergency Incident Response');
      expect(emergencyGoal?.activityRecords?.[0].durationMinutes).toBe(120);
    });

    it('skips life goal sync entirely when activity is marked isReplaced', async () => {
      const updatedGoals = await LifeGoalRepository.syncCompletedRoutineToLifeGoals(
        userId,
        targetDate,
        baseTemplate.id,
        baseTemplate.title,
        120,
        'Replaced block',
        {
          isReplaced: true,
        }
      );

      expect(updatedGoals).toEqual([]);
      const goalsAfter = LifeGoalRepository.getLocalLifeGoals(userId);
      const originalGoal = goalsAfter.find((g) => g.id === 'goal_system_mastery');
      expect(originalGoal?.currentValue).toBe(50);
    });
  });

  describe('3. Notification Reconciliation (FR-005)', () => {
    it('filters out notifications for replaced occurrences while keeping replacements active', () => {
      const fakeNow = new Date('2026-10-28T00:00:00.000Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

      const override: OccurrenceOverride = {
        id: `override_${baseTemplate.id}_${targetDate}`,
        userId,
        templateId: baseTemplate.id,
        date: targetDate,
        isCancelled: false,
        isPostponed: false,
        isReplaced: true,
        replacementActivity: {
          id: 'adhoc_meeting',
          title: 'Ad-hoc Strategy Meeting',
          category: 'work',
          startTime: '10:00',
          endTime: '11:00',
          durationMinutes: 60,
          isTemporary: true,
        },
        originalActivitySnapshot: {
          title: baseTemplate.title,
          category: baseTemplate.category,
          startTime: baseTemplate.startTime,
          endTime: baseTemplate.endTime,
          durationMinutes: 120,
        },
        updatedAt: Date.now(),
      };

      const scheduled = NotificationManager.compute72HourSchedule(
        [baseTemplate],
        [override],
        defaultPrefs,
        targetDate,
        []
      );

      // Check scheduled notification occurrence IDs
      const scheduledOccIds = scheduled.map((s) => s.occurrenceId);

      // Original replaced block should NOT be scheduled
      const origOccId = `${baseTemplate.id}_${targetDate}`;
      expect(scheduledOccIds).not.toContain(origOccId);

      // Replacement block SHOULD have notifications scheduled
      const replOccId = `replace_${baseTemplate.id}_${targetDate}`;
      expect(scheduledOccIds).toContain(replOccId);
    });
  });

  describe('4. Analytics Accounting (FR-008)', () => {
    it('accounts for replaced blocks in status counts and prevents planned time double counting', () => {
      const override: OccurrenceOverride = {
        id: `override_${baseTemplate.id}_${targetDate}`,
        userId,
        templateId: baseTemplate.id,
        date: targetDate,
        isCancelled: false,
        isPostponed: false,
        isReplaced: true,
        replacementActivity: {
          id: 'adhoc_meeting',
          title: 'Urgent Strategy Meeting',
          category: 'work',
          startTime: '10:00',
          endTime: '12:00',
          durationMinutes: 120,
          isTemporary: true,
        },
        originalActivitySnapshot: {
          title: baseTemplate.title,
          category: baseTemplate.category,
          startTime: baseTemplate.startTime,
          endTime: baseTemplate.endTime,
          durationMinutes: 120,
        },
        updatedAt: Date.now(),
      };

      const occurrences = generateDailyOccurrences([baseTemplate], [override], [], targetDate);

      const summary = AnalyticsCalculator.computeSummary(
        occurrences,
        [],
        'day',
        targetDate,
        targetDate
      );

      // Planned minutes should be 120 (not 240, because replacement occurrence is excluded from planned sum)
      expect(summary.totalPlannedMinutes).toBe(120);

      // statusCounts should track replaced block
      expect(summary.statusCounts.replaced).toBe(1);

      // With no completed logs yet, actual minutes should be 0
      expect(summary.totalActualMinutes).toBe(0);
    });

    it('credits partial minutes when original block has partial work before replacement', () => {
      const override: OccurrenceOverride = {
        id: `override_${baseTemplate.id}_${targetDate}`,
        userId,
        templateId: baseTemplate.id,
        date: targetDate,
        isCancelled: false,
        isPostponed: false,
        isReplaced: true,
        replacementActivity: {
          id: 'adhoc_errand',
          title: 'Urgent Errand',
          category: 'personal',
          startTime: '10:30',
          endTime: '12:00',
          durationMinutes: 90,
          isTemporary: true,
        },
        originalActivitySnapshot: {
          title: baseTemplate.title,
          category: baseTemplate.category,
          startTime: baseTemplate.startTime,
          endTime: baseTemplate.endTime,
          durationMinutes: 120,
        },
        partialDurationMinutes: 30,
        updatedAt: Date.now(),
      };

      const partialLog: ActivityLog = {
        id: `${targetDate}_${baseTemplate.id}`,
        userId,
        templateId: baseTemplate.id,
        date: targetDate,
        status: 'partial',
        actualDurationMinutes: 30,
        targetDurationMinutes: 120,
        completionNotes: '',
        updatedAt: Date.now(),
      };

      const occurrences = generateDailyOccurrences([baseTemplate], [override], [partialLog], targetDate);

      const summary = AnalyticsCalculator.computeSummary(
        occurrences,
        [],
        'day',
        targetDate,
        targetDate
      );

      // Partial minutes should be accounted in actual minutes
      expect(summary.totalActualMinutes).toBe(30);
      expect(summary.statusCounts.partial).toBe(1);
    });
  });
});
