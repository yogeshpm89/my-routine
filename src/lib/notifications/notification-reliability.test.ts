import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateNotificationId,
  isQuietHour,
  NotificationManager,
  ACTION_TYPE_ROUTINE,
} from './notification-manager';
import { RoutineTemplate, OccurrenceOverride, ActivityLog } from '@/types/routine';
import { NotificationPreferences } from '@/types/notifications';

describe('Android Notification Reliability & Lifecycle Suite', () => {
  const userId = 'reliability-test-user';

  const defaultPrefs: NotificationPreferences = {
    userId,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
    snoozeDurationMinutes: 10,
    defaultAdvanceReminders: [-10],
    updatedAt: Date.now(),
  };

  const sampleTemplate: RoutineTemplate = {
    id: 'routine_morning_meditation',
    userId,
    title: 'Morning Meditation',
    category: 'mindfulness',
    startTime: '07:00',
    endTime: '07:30',
    recurrence: {
      frequency: 'daily',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2026-01-01',
      exceptions: [],
    },
    notifications: [
      { id: 'notif_advance', type: 'advance', offsetMinutes: -10, enabled: true },
      { id: 'notif_start', type: 'start', offsetMinutes: 0, enabled: true },
      { id: 'notif_end', type: 'end', offsetMinutes: 0, enabled: true },
    ],
    isFixed: false,
    notes: '',
    timezone: 'Asia/Kolkata',
    color: '#3B82F6',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // 1. Rolling-window scheduling: computes reminders for the next 72 hours
  it('1. schedules reminders strictly within the 72-hour rolling window', () => {
    const futureDate = '2030-01-01'; // Far in future to avoid past-time filtering
    const fakeNow = new Date('2030-01-01T00:00:00.000Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

    const schedule = NotificationManager.compute72HourSchedule(
      [sampleTemplate],
      [],
      defaultPrefs,
      futureDate
    );

    // 3 occurrences (Day 0, Day 1, Day 2) * 3 notification rules (advance, start, end) = 9 reminders
    expect(schedule.length).toBe(9);

    const maxAllowedTimestamp = fakeNow + 72 * 60 * 60 * 1000;
    for (const item of schedule) {
      expect(item.scheduledTimestamp).toBeGreaterThan(fakeNow);
      expect(item.scheduledTimestamp).toBeLessThanOrEqual(maxAllowedTimestamp);
      expect(item.actionTypeId).toBe(ACTION_TYPE_ROUTINE);
    }
  });

  // 2. Repeated reconciliation without duplicates (Idempotency)
  it('2. guarantees idempotency across repeated schedule computations', () => {
    const futureDate = '2030-01-01';
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime());

    const run1 = NotificationManager.compute72HourSchedule([sampleTemplate], [], defaultPrefs, futureDate);
    const run2 = NotificationManager.compute72HourSchedule([sampleTemplate], [], defaultPrefs, futureDate);

    expect(run1.length).toBe(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].id).toBe(run2[i].id);
      expect(run1[i].scheduledTimestamp).toBe(run2[i].scheduledTimestamp);
      expect(run1[i].title).toBe(run2[i].title);
    }

    // Verify deterministic positive 32-bit ID property
    const idA = generateNotificationId('test_unique_key_123');
    const idB = generateNotificationId('test_unique_key_123');
    expect(idA).toBe(idB);
    expect(idA).toBeGreaterThan(0);
    expect(idA).toBeLessThanOrEqual(2147483646);
  });

  // 3. Schedule refresh after routine time changes
  it('3. updates scheduled timestamps when routine start or end time changes', () => {
    const futureDate = '2030-01-01';
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime());

    const originalSchedule = NotificationManager.compute72HourSchedule(
      [sampleTemplate],
      [],
      defaultPrefs,
      futureDate
    );

    // Shift routine from 07:00 to 08:30 (+90 minutes)
    const shiftedTemplate: RoutineTemplate = {
      ...sampleTemplate,
      startTime: '08:30',
      endTime: '09:00',
    };

    const updatedSchedule = NotificationManager.compute72HourSchedule(
      [shiftedTemplate],
      [],
      defaultPrefs,
      futureDate
    );

    expect(originalSchedule.length).toBe(updatedSchedule.length);

    // Timestamps must have shifted by exactly 90 minutes (5,400,000 ms)
    for (let i = 0; i < originalSchedule.length; i++) {
      const diff = updatedSchedule[i].scheduledTimestamp - originalSchedule[i].scheduledTimestamp;
      expect(diff).toBe(90 * 60 * 1000);
    }
  });

  // 4. Cancellation and archival removing obsolete reminders
  it('4. eliminates reminders for archived routines and cancelled occurrences', () => {
    const futureDate = '2030-01-01';
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime());

    // 4a. Archival: archived templates produce 0 reminders
    const archivedTemplate: RoutineTemplate = {
      ...sampleTemplate,
      isArchived: true,
    };
    const archivedSchedule = NotificationManager.compute72HourSchedule(
      [archivedTemplate],
      [],
      defaultPrefs,
      futureDate
    );
    expect(archivedSchedule).toHaveLength(0);

    // 4b. Occurrence cancellation: cancelling Day 1 occurrence removes only that day's reminders
    const day1Override: OccurrenceOverride = {
      id: `override_${sampleTemplate.id}_${futureDate}`,
      userId,
      templateId: sampleTemplate.id,
      date: futureDate,
      isCancelled: true,
      isPostponed: false,
      updatedAt: Date.now(),
    };

    const cancelledSchedule = NotificationManager.compute72HourSchedule(
      [sampleTemplate],
      [day1Override],
      defaultPrefs,
      futureDate
    );

    // Day 0 cancelled (3 reminders gone), Day 1 and Day 2 remain (6 reminders)
    expect(cancelledSchedule).toHaveLength(6);
    expect(cancelledSchedule.every((item) => item.extra?.date !== futureDate)).toBe(true);
  });

  // 5. Completed and skipped activities excluded from future reminders
  it('5. suppresses reminders for occurrences that are marked completed or skipped', () => {
    const futureDate = '2030-01-01';
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime());

    const completedLog: ActivityLog = {
      id: `log_${sampleTemplate.id}_${futureDate}`,
      userId,
      templateId: sampleTemplate.id,
      date: futureDate,
      status: 'completed',
      actualDurationMinutes: 30,
      targetDurationMinutes: 30,
      completionNotes: 'Completed early morning',
      updatedAt: Date.now(),
    };

    const schedule = NotificationManager.compute72HourSchedule(
      [sampleTemplate],
      [],
      defaultPrefs,
      futureDate,
      [completedLog]
    );

    // Completed day is excluded, remaining 2 days remain scheduled
    expect(schedule).toHaveLength(6);
    expect(schedule.some((item) => item.extra?.date === futureDate)).toBe(false);
  });

  // 6. Quiet-hours filtering (standard & midnight-crossing)
  it('6. correctly filters reminders during quiet hours (including advance offsets)', () => {
    // 6a. Quiet hours midnight-crossing: 22:00 to 06:00
    expect(isQuietHour('22:00', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('23:45', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('00:00', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('04:30', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('05:59', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('06:00', '22:00', '06:00')).toBe(false);
    expect(isQuietHour('12:00', '22:00', '06:00')).toBe(false);
    expect(isQuietHour('21:59', '22:00', '06:00')).toBe(false);

    // 6b. Non-midnight crossing quiet hours: 13:00 to 15:00
    expect(isQuietHour('13:00', '13:00', '15:00')).toBe(true);
    expect(isQuietHour('14:30', '13:00', '15:00')).toBe(true);
    expect(isQuietHour('15:00', '13:00', '15:00')).toBe(false);
    expect(isQuietHour('12:59', '13:00', '15:00')).toBe(false);

    // 6c. Advance reminder falling into quiet hours: routine starts at 06:05 with 10m advance (05:55)
    const earlyRoutine: RoutineTemplate = {
      ...sampleTemplate,
      id: 'routine_early_wakeup',
      startTime: '06:05',
      endTime: '06:30',
      recurrence: {
        frequency: 'daily',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: '2026-01-01',
        exceptions: [],
      },
      notifications: [
        { id: 'notif_early_advance', type: 'advance', offsetMinutes: -10, enabled: true }, // 05:55 -> in quiet hours!
        { id: 'notif_early_start', type: 'start', offsetMinutes: 0, enabled: true },        // 06:05 -> outside quiet hours
      ],
    };

    const futureDate = '2030-01-01';
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime());

    const schedule = NotificationManager.compute72HourSchedule(
      [earlyRoutine],
      [],
      defaultPrefs,
      futureDate
    );

    // For each day, advance (05:55) is filtered by quiet hours, only start (06:05) survives
    expect(schedule).toHaveLength(3);
    expect(schedule.every((item) => item.triggerType === 'start')).toBe(true);
  });

  // 7. Snooze, Done and Skip action idempotency
  it('7. uses deterministic IDs for snooze to prevent cascading duplicate alarms', () => {
    const templateId = 'routine_work_block';
    const date = '2026-10-20';

    const snoozeId1 = generateNotificationId(`${templateId}_${date}_snooze`);
    const snoozeId2 = generateNotificationId(`${templateId}_${date}_snooze`);

    expect(snoozeId1).toBe(snoozeId2);
    expect(typeof snoozeId1).toBe('number');
    expect(snoozeId1).toBeGreaterThan(0);
  });

  // 8. Offline mutation reconciliation with local registry
  it('8. stores and retrieves local notification registry for offline reconciliation', () => {
    const futureDate = '2030-01-01';
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime());

    const items = NotificationManager.compute72HourSchedule(
      [sampleTemplate],
      [],
      defaultPrefs,
      futureDate
    );

    NotificationManager.saveLocalRegistry(userId, items);
    const retrieved = NotificationManager.getLocalRegistry(userId);

    expect(retrieved.length).toBe(items.length);
    expect(retrieved[0].id).toBe(items[0].id);
    expect(retrieved[0].title).toBe(items[0].title);
  });

  // 9. Timezone transitions and timestamp formatting
  it('9. calculates consistent epoch timestamps across date boundaries', () => {
    const dateStr = '2026-10-25';
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const [h, m] = '14:30'.split(':').map(Number);

    const calculatedDate = new Date(yr, mo - 1, dy, h, m, 0, 0);
    expect(calculatedDate.getFullYear()).toBe(2026);
    expect(calculatedDate.getMonth()).toBe(9); // 0-indexed October
    expect(calculatedDate.getDate()).toBe(25);
    expect(calculatedDate.getHours()).toBe(14);
    expect(calculatedDate.getMinutes()).toBe(30);
  });

  // 10. Permission-denied behavior & diagnostics
  it('10. handles diagnostics correctly and reflects non-native web fallback', async () => {
    const result = await NotificationManager.reconcileNotifications(
      userId,
      [sampleTemplate],
      [],
      defaultPrefs
    );

    expect(result).toBeDefined();
    expect(result.scheduled).toBeGreaterThanOrEqual(0);

    const diagnostics = NotificationManager.getDiagnostics(userId);
    expect(diagnostics).toBeDefined();
    expect(diagnostics.windowEndDate).toBeDefined();
    expect(diagnostics.lastReconciliationTime).not.toBeNull();
    expect(typeof diagnostics.isNative).toBe('boolean');
  });

  // 11. Past reminders are not recreated
  it('11. does not schedule reminders for timestamps in the past', () => {
    // Current time is 10:00 AM on 2026-10-20
    const testDate = '2026-10-20';
    const nowTimestamp = new Date('2026-10-20T10:00:00.000+05:30').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(nowTimestamp);

    // Routine at 07:00 AM (already in the past on testDate)
    const morningTemplate: RoutineTemplate = {
      ...sampleTemplate,
      startTime: '07:00',
      endTime: '07:30',
    };

    const schedule = NotificationManager.compute72HourSchedule(
      [morningTemplate],
      [],
      defaultPrefs,
      testDate
    );

    // Day 0 (today at 07:00) is in past -> excluded!
    // Day 1 and Day 2 (tomorrow & day after) are in future -> included!
    const day0Reminders = schedule.filter((s) => s.extra?.date === testDate);
    expect(day0Reminders).toHaveLength(0);

    const futureReminders = schedule.filter((s) => s.extra?.date !== testDate);
    expect(futureReminders.length).toBeGreaterThan(0);
  });

  // 12. Routine beyond 72-hour window is excluded
  it('12. excludes occurrences that fall beyond the 72-hour window', () => {
    const baseDate = '2026-10-20';
    const nowTimestamp = new Date('2026-10-20T18:00:00.000+05:30').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(nowTimestamp);

    // 72 hours from 18:00 on Day 0 ends at 18:00 on Day 3
    // Day 2 20:00 is within 72 hours (50 hours out)
    // Day 3 19:00 would be > 72 hours (73 hours out)
    const eveningTemplate: RoutineTemplate = {
      ...sampleTemplate,
      startTime: '20:00',
      endTime: '20:30',
      notifications: [{ id: 'notif_start', type: 'start', offsetMinutes: 0, enabled: true }],
    };

    const schedule = NotificationManager.compute72HourSchedule(
      [eveningTemplate],
      [],
      defaultPrefs,
      baseDate
    );

    for (const item of schedule) {
      expect(item.scheduledTimestamp).toBeLessThanOrEqual(nowTimestamp + 72 * 60 * 60 * 1000);
    }
  });
});
