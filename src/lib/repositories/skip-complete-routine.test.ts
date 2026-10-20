import { describe, it, expect, beforeEach } from 'vitest';
import { LogRepository } from './log-repository';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { NotificationManager } from '@/lib/notifications/notification-manager';
import { RoutineTemplate } from '@/types/routine';

describe('Skip Complete Routine & LogRepository Bulk Operations', () => {
  const userId = 'test-skip-routine-user';
  const targetDate = '2026-10-24'; // Saturday (Weekend)

  const templates: RoutineTemplate[] = [
    {
      id: 'template_morning_workout',
      userId,
      title: 'Morning Workout',
      category: 'fitness',
      startTime: '07:00',
      endTime: '08:00',
      isFixed: false,
      recurrence: {
        frequency: 'daily',
        daysOfWeek: [],
        startDate: '2026-10-01',
        exceptions: [],
      },
      notifications: [
        { id: 'notif_1', type: 'advance', offsetMinutes: -10, enabled: true },
      ],
      notes: '',
      color: '#3b82f6',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'template_deep_work',
      userId,
      title: 'Deep Work Block',
      category: 'work',
      startTime: '09:00',
      endTime: '12:00',
      isFixed: false,
      recurrence: {
        frequency: 'daily',
        daysOfWeek: [],
        startDate: '2026-10-01',
        exceptions: [],
      },
      notifications: [
        { id: 'notif_2', type: 'start', offsetMinutes: 0, enabled: true },
      ],
      notes: '',
      color: '#10b981',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'template_evening_reading',
      userId,
      title: 'Evening Reading',
      category: 'learning',
      startTime: '21:00',
      endTime: '22:00',
      isFixed: false,
      recurrence: {
        frequency: 'daily',
        daysOfWeek: [],
        startDate: '2026-10-01',
        exceptions: [],
      },
      notifications: [],
      notes: '',
      color: '#8b5cf6',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('bulkUpdateStatus marks all template occurrences as skipped for a date', async () => {
    const templateIds = templates.map((t) => t.id);

    // Initial occurrences should all be pending
    const initialOccs = generateDailyOccurrences(templates, [], [], targetDate);
    expect(initialOccs).toHaveLength(3);
    expect(initialOccs.every((o) => o.log?.status === undefined || o.log?.status === 'pending')).toBe(true);

    // User skips complete routine with reason: Weekend Break
    const reason = 'Weekend Break: Taking Saturday off';
    const updatedLogs = await LogRepository.bulkUpdateStatus(
      userId,
      targetDate,
      templateIds,
      'skipped',
      { completionNotes: reason }
    );

    expect(updatedLogs).toHaveLength(3);
    expect(updatedLogs.every((l) => l.status === 'skipped')).toBe(true);
    expect(updatedLogs.every((l) => l.completionNotes === reason)).toBe(true);

    // Now re-generate occurrences with updated logs
    const savedLogs = LogRepository.getLocalLogs(userId);
    const skippedOccs = generateDailyOccurrences(templates, [], savedLogs, targetDate);

    expect(skippedOccs).toHaveLength(3);
    expect(skippedOccs.every((o) => o.log?.status === 'skipped')).toBe(true);
  });

  it('bulkResetToPending unskips and restores all occurrences back to pending', async () => {
    const templateIds = templates.map((t) => t.id);

    // Skip all
    await LogRepository.bulkUpdateStatus(userId, targetDate, templateIds, 'skipped', {
      completionNotes: 'Holiday Break',
    });

    let logs = LogRepository.getLocalLogs(userId);
    expect(logs.every((l) => l.status === 'skipped')).toBe(true);

    // User resumes routine
    const resumedLogs = await LogRepository.bulkResetToPending(userId, targetDate, templateIds);
    expect(resumedLogs).toHaveLength(3);
    expect(resumedLogs.every((l) => l.status === 'pending')).toBe(true);

    logs = LogRepository.getLocalLogs(userId);
    const occs = generateDailyOccurrences(templates, [], logs, targetDate);
    expect(occs.every((o) => o.log?.status === 'pending')).toBe(true);
  });

  it('verifies notification reconciliation ignores skipped occurrences', async () => {
    const templateIds = templates.map((t) => t.id);

    // Skip complete routine
    await LogRepository.bulkUpdateStatus(userId, targetDate, templateIds, 'skipped', {
      completionNotes: 'Weekend Day Off',
    });

    const logs = LogRepository.getLocalLogs(userId);
    const occs = generateDailyOccurrences(templates, [], logs, targetDate);

    // When occ.log?.status === 'skipped', NotificationManager skips scheduling alarms
    const activeOccs = occs.filter(
      (o) => o.log?.status !== 'completed' && o.log?.status !== 'skipped'
    );
    expect(activeOccs).toHaveLength(0);
  });
});
