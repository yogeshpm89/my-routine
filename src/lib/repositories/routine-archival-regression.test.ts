import { describe, it, expect, beforeEach } from 'vitest';
import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { OverrideRepository } from '@/lib/repositories/override-repository';
import { LogRepository } from '@/lib/repositories/log-repository';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { detectScheduleConflicts } from '@/lib/conflict-detector';
import { AnalyticsCalculator } from '@/lib/analytics/analytics-calculator';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
} from '@/types/routine';

describe('P0 Data Integrity & Archival Regression Suite', () => {
  const userId = 'user_integrity_test';
  const today = '2026-10-15';
  const yesterday = '2026-10-14';
  const tomorrow = '2026-10-16';

  const dailyTemplate: RoutineTemplate = {
    id: 'tmpl_daily_workout',
    userId,
    title: 'Daily Morning Workout',
    category: 'fitness',
    startTime: '07:00',
    endTime: '08:00',
    isFixed: true,
    recurrence: {
      frequency: 'daily',
      daysOfWeek: [],
      startDate: '2026-10-01',
      endDate: null,
      exceptions: [],
    },
    notifications: [],
    media: [],
    notes: 'Pushups and stretching',
    color: '#10b981',
    timezone: 'Asia/Kolkata',
    isArchived: false,
    archivedAt: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const oneTimeTemplate: RoutineTemplate = {
    id: 'tmpl_dentist_visit',
    userId,
    title: 'Dentist Checkup',
    category: 'health',
    startTime: '14:00',
    endTime: '15:00',
    isFixed: true,
    recurrence: {
      frequency: 'once',
      daysOfWeek: [],
      startDate: today,
      endDate: null,
      exceptions: [],
    },
    notifications: [],
    media: [],
    notes: 'Annual cleaning',
    color: '#3b82f6',
    timezone: 'Asia/Kolkata',
    isArchived: false,
    archivedAt: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Cancelling today's occurrence leaves the master routine active
  it('1. Cancelling today occurrence leaves master routine active', async () => {
    await RoutineRepository.saveTemplate(dailyTemplate);

    // Cancel today only via OccurrenceOverride
    const override: OccurrenceOverride = {
      id: `override_${dailyTemplate.id}_${today}`,
      userId,
      templateId: dailyTemplate.id,
      date: today,
      isCancelled: true,
      isPostponed: false,
      updatedAt: Date.now(),
    };
    await OverrideRepository.saveOverride(override);

    // Verify master template remains active
    const localTemplates = RoutineRepository.getLocalTemplates(userId);
    const tmpl = localTemplates.find((t) => t.id === dailyTemplate.id);
    expect(tmpl).toBeDefined();
    expect(tmpl?.isArchived).toBe(false);

    // Verify today's occurrences exclude it
    const todayOccs = generateDailyOccurrences(localTemplates, [override], [], today);
    expect(todayOccs.find((o) => o.templateId === dailyTemplate.id)).toBeUndefined();

    // Verify tomorrow's occurrences still include it
    const tomorrowOccs = generateDailyOccurrences(localTemplates, [override], [], tomorrow);
    const tomorrowItem = tomorrowOccs.find((o) => o.templateId === dailyTemplate.id);
    expect(tomorrowItem).toBeDefined();
    expect(tomorrowItem?.title).toBe('Daily Morning Workout');
  });

  // 2. Cancelling one occurrence does not cancel other dates
  it('2. Cancelling one occurrence does not cancel other dates', async () => {
    await RoutineRepository.saveTemplate(dailyTemplate);
    await RoutineRepository.saveTemplate(oneTimeTemplate);

    const cancelOverride: OccurrenceOverride = {
      id: `override_${dailyTemplate.id}_${today}`,
      userId,
      templateId: dailyTemplate.id,
      date: today,
      isCancelled: true,
      isPostponed: false,
      updatedAt: Date.now(),
    };
    await OverrideRepository.saveOverride(cancelOverride);

    // Today excludes workout
    const todayOccs = generateDailyOccurrences([dailyTemplate], [cancelOverride], [], today);
    expect(todayOccs.find((o) => o.templateId === dailyTemplate.id)).toBeUndefined();

    // Yesterday and Tomorrow both include workout
    const yesterdayOccs = generateDailyOccurrences([dailyTemplate], [cancelOverride], [], yesterday);
    expect(yesterdayOccs.find((o) => o.templateId === dailyTemplate.id)).toBeDefined();

    const tomorrowOccs = generateDailyOccurrences([dailyTemplate], [cancelOverride], [], tomorrow);
    expect(tomorrowOccs.find((o) => o.templateId === dailyTemplate.id)).toBeDefined();
  });

  // 3. Archiving a routine prevents new future occurrences
  it('3. Archiving a routine prevents new future occurrences', async () => {
    await RoutineRepository.saveTemplate(dailyTemplate);
    const archived = await RoutineRepository.archiveTemplate(userId, dailyTemplate.id);

    expect(archived).not.toBeNull();
    expect(archived?.isArchived).toBe(true);
    expect(archived?.archivedAt).toBeTypeOf('number');

    const templates = RoutineRepository.getLocalTemplates(userId);
    // On tomorrow (without historical log), no occurrence should be generated
    const tomorrowOccs = generateDailyOccurrences(templates, [], [], tomorrow);
    expect(tomorrowOccs.find((o) => o.templateId === dailyTemplate.id)).toBeUndefined();

    // Even days into the future, no occurrences
    const futureDate = '2026-11-01';
    const futureOccs = generateDailyOccurrences(templates, [], [], futureDate);
    expect(futureOccs.find((o) => o.templateId === dailyTemplate.id)).toBeUndefined();
  });

  // 4. Archiving does not remove previous completed activities from historical calendar views
  it('4. Archiving does not remove previous completed activities from historical calendar views', async () => {
    await RoutineRepository.saveTemplate(dailyTemplate);

    // Log yesterday as completed
    const pastLog: ActivityLog = {
      id: `log_${yesterday}_${dailyTemplate.id}`,
      userId,
      templateId: dailyTemplate.id,
      date: yesterday,
      status: 'completed',
      actualStartTime: '07:05',
      actualEndTime: '08:00',
      actualDurationMinutes: 55,
      targetDurationMinutes: 60,
      completionNotes: '',
      updatedAt: Date.now(),
    };
    await LogRepository.saveLog(pastLog);

    // Now archive the routine today
    await RoutineRepository.archiveTemplate(userId, dailyTemplate.id);
    const templates = RoutineRepository.getLocalTemplates(userId);

    // When viewing yesterday in calendar (Week or Month view)
    const yesterdayOccs = generateDailyOccurrences(templates, [], [pastLog], yesterday);
    const completedOcc = yesterdayOccs.find((o) => o.templateId === dailyTemplate.id);

    expect(completedOcc).toBeDefined();
    expect(completedOcc?.title).toBe('Daily Morning Workout');
    expect(completedOcc?.log?.status).toBe('completed');
    expect(completedOcc?.log?.actualDurationMinutes).toBe(55);

    // But today and tomorrow (with no logs) show nothing
    const todayOccs = generateDailyOccurrences(templates, [], [pastLog], today);
    expect(todayOccs.find((o) => o.templateId === dailyTemplate.id)).toBeUndefined();
  });

  // 5. Historical completion logs and analytics remain intact
  it('5. Historical completion logs and analytics remain intact after archival', async () => {
    await RoutineRepository.saveTemplate(dailyTemplate);

    const pastLog: ActivityLog = {
      id: `log_${yesterday}_${dailyTemplate.id}`,
      userId,
      templateId: dailyTemplate.id,
      date: yesterday,
      status: 'completed',
      actualDurationMinutes: 60,
      targetDurationMinutes: 60,
      completionNotes: '',
      updatedAt: Date.now(),
    };
    await LogRepository.saveLog(pastLog);

    // Compute analytics before archival
    const templatesBefore = RoutineRepository.getLocalTemplates(userId);
    const occsBefore = generateDailyOccurrences(templatesBefore, [], [pastLog], yesterday);
    const summaryBefore = AnalyticsCalculator.computeSummary(occsBefore, [], 'day', yesterday, yesterday);

    expect(summaryBefore.statusCounts.completed).toBe(1);

    // Archive the routine
    await RoutineRepository.archiveTemplate(userId, dailyTemplate.id);

    // Compute analytics after archival for the historical date
    const templatesAfter = RoutineRepository.getLocalTemplates(userId);
    const occsAfter = generateDailyOccurrences(templatesAfter, [], [pastLog], yesterday);
    const summaryAfter = AnalyticsCalculator.computeSummary(occsAfter, [], 'day', yesterday, yesterday);

    expect(summaryAfter.statusCounts.completed).toBe(summaryBefore.statusCounts.completed);
    expect(summaryAfter.totalPlannedMinutes).toBe(summaryBefore.totalPlannedMinutes);
    expect(summaryAfter.totalActualMinutes).toBe(summaryBefore.totalActualMinutes);
    expect(summaryAfter.completionRate).toBe(summaryBefore.completionRate);
  });

  // 6. An archived routine is not shown as an active routine
  it('6. An archived routine is not shown as an active routine', async () => {
    await RoutineRepository.saveTemplate(dailyTemplate);
    await RoutineRepository.saveTemplate(oneTimeTemplate);

    await RoutineRepository.archiveTemplate(userId, dailyTemplate.id);

    const activeTemplates = RoutineRepository.getActiveLocalTemplates(userId);
    const archivedTemplates = RoutineRepository.getArchivedLocalTemplates(userId);

    expect(activeTemplates.some((t) => t.id === dailyTemplate.id)).toBe(false);
    expect(activeTemplates.some((t) => t.id === oneTimeTemplate.id)).toBe(true);

    expect(archivedTemplates.some((t) => t.id === dailyTemplate.id)).toBe(true);
    expect(archivedTemplates.some((t) => t.id === oneTimeTemplate.id)).toBe(false);
  });

  // 7. Existing routines without an archival field continue working correctly
  it('7. Existing routines without an archival field continue working correctly (migration safe)', async () => {
    // Simulate legacy routine stored in localStorage without isArchived or archivedAt
    const legacyTemplate: Record<string, unknown> = {
      id: 'tmpl_legacy',
      userId,
      title: 'Legacy Morning Routine',
      category: 'morning',
      startTime: '06:00',
      endTime: '07:00',
      isFixed: false,
      recurrence: {
        frequency: 'daily',
        daysOfWeek: [],
        startDate: '2026-01-01',
        endDate: null,
      },
      notifications: [],
      media: [],
      notes: '',
      color: '#3b82f6',
      // note: isArchived and archivedAt are intentionally omitted
      createdAt: 1600000000000,
      updatedAt: 1600000000000,
    };

    localStorage.setItem(`my_routine_templates_${userId}`, JSON.stringify([legacyTemplate]));

    const loaded = RoutineRepository.getLocalTemplates(userId);
    expect(loaded[0].id).toBe('tmpl_legacy');
    expect(loaded[0].isArchived).toBe(false);

    // Active query should include it
    const active = RoutineRepository.getActiveLocalTemplates(userId);
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('tmpl_legacy');

    // Occurrences generate normally
    const occs = generateDailyOccurrences(loaded, [], [], today);
    expect(occs.length).toBe(1);
    expect(occs[0].title).toBe('Legacy Morning Routine');
  });

  // 8. Offline archival is queued and synchronized using existing mechanisms
  it('8. Offline archival is queued and synchronized in MutationQueue', async () => {
    await RoutineRepository.saveTemplate(dailyTemplate);

    // Clear queue to isolate archival mutation
    MutationQueue.saveQueue(userId, []);

    // Archive template
    await RoutineRepository.archiveTemplate(userId, dailyTemplate.id);

    const queue = MutationQueue.getQueue(userId);
    expect(queue.length).toBe(1);
    expect(queue[0].collection).toBe('templates');
    expect(queue[0].action).toBe('set');
    expect(queue[0].docId).toBe(dailyTemplate.id);
    expect(queue[0].payload.isArchived).toBe(true);
    expect(queue[0].payload.archivedAt).toBeTypeOf('number');
  });

  // 9. Repeated deletion actions do not create duplicate overrides or mutations
  it('9. Repeated deletion/cancellation actions do not create duplicate overrides or mutations', async () => {
    await RoutineRepository.saveTemplate(dailyTemplate);

    const override1: OccurrenceOverride = {
      id: `override_${dailyTemplate.id}_${today}`,
      userId,
      templateId: dailyTemplate.id,
      date: today,
      isCancelled: true,
      isPostponed: false,
      updatedAt: 1000,
    };
    await OverrideRepository.saveOverride(override1);

    // Repeated identical cancellation action
    const override2: OccurrenceOverride = {
      id: `override_${dailyTemplate.id}_${today}`,
      userId,
      templateId: dailyTemplate.id,
      date: today,
      isCancelled: true,
      isPostponed: false,
      updatedAt: 2000,
    };
    await OverrideRepository.saveOverride(override2);

    const allOverrides = OverrideRepository.getLocalOverrides(userId);
    const matchingOverrides = allOverrides.filter((o) => o.id === override1.id);
    expect(matchingOverrides.length).toBe(1);
    expect(matchingOverrides[0].updatedAt).toBeGreaterThanOrEqual(1000);

    // Verify MutationQueue deduplication
    const queue = MutationQueue.getQueue(userId).filter(
      (m) => m.collection === 'overrides' && m.docId === override1.id
    );
    expect(queue.length).toBe(1);
  });

  // 10. Failed persistence does not falsely report a successful deletion or archival
  it('10. Non-existent template archival returns null and does not report success', async () => {
    const result = await RoutineRepository.archiveTemplate(userId, 'non_existent_id');
    expect(result).toBeNull();
  });

  // 11. Existing recurrence rules and conflict detection continue to pass
  it('11. Recurrence rules and conflict detection remain consistent with archival', async () => {
    const activeDaily = { ...dailyTemplate };
    const overlapping = {
      ...dailyTemplate,
      id: 'tmpl_overlap',
      title: 'Overlapping Meeting',
      startTime: '07:30',
      endTime: '08:30',
    };

    // When both active, conflict detector finds fixed collision
    const occsBefore = generateDailyOccurrences([activeDaily, overlapping], [], [], today);
    const conflictsBefore = detectScheduleConflicts(occsBefore, [], 4);
    const collisionBefore = conflictsBefore.find((c) => c.type === 'fixed_collision');
    expect(collisionBefore).toBeDefined();

    // When overlapping routine is archived, it no longer creates a conflict
    await RoutineRepository.saveTemplate(overlapping);
    await RoutineRepository.archiveTemplate(userId, overlapping.id);

    const templatesAfter = [
      activeDaily,
      (await RoutineRepository.getLocalTemplates(userId)).find((t) => t.id === overlapping.id)!,
    ];
    const occsAfter = generateDailyOccurrences(templatesAfter, [], [], today);
    const conflictsAfter = detectScheduleConflicts(occsAfter, [], 4);
    const collisionAfter = conflictsAfter.find((c) => c.type === 'fixed_collision');
    expect(collisionAfter).toBeUndefined();
  });

  // One-time activity archival and cancellation tests
  it('correctly handles one-time activity cancellation and archival', async () => {
    await RoutineRepository.saveTemplate(oneTimeTemplate);

    // Cancel one-time activity
    const override: OccurrenceOverride = {
      id: `override_${oneTimeTemplate.id}_${today}`,
      userId,
      templateId: oneTimeTemplate.id,
      date: today,
      isCancelled: true,
      isPostponed: false,
      updatedAt: Date.now(),
    };
    await OverrideRepository.saveOverride(override);

    const occsCancelled = generateDailyOccurrences([oneTimeTemplate], [override], [], today);
    expect(occsCancelled.length).toBe(0);

    // Archive one-time activity
    await RoutineRepository.archiveTemplate(userId, oneTimeTemplate.id);
    const loadedTemplates = RoutineRepository.getLocalTemplates(userId);
    const tmpl = loadedTemplates.find((t) => t.id === oneTimeTemplate.id);
    expect(tmpl?.isArchived).toBe(true);

    const active = RoutineRepository.getActiveLocalTemplates(userId);
    expect(active.find((t) => t.id === oneTimeTemplate.id)).toBeUndefined();
  });
});
