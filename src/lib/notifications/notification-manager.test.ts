import { describe, it, expect, vi } from 'vitest';
import {
  generateNotificationId,
  isQuietHour,
  NotificationManager,
} from './notification-manager';
import { getInitialRoutineTemplates } from '@/lib/seed-data';
import { getDefaultPreferences } from './preferences-repository';

describe('Native Local Notification Manager', () => {
  const userId = 'test-notif-user';
  const templates = getInitialRoutineTemplates(userId);
  const prefs = getDefaultPreferences(userId);

  it('generates deterministic positive 32-bit integer IDs', () => {
    const id1 = generateNotificationId('template_meditation_start_0');
    const id2 = generateNotificationId('template_meditation_start_0');
    const id3 = generateNotificationId('template_keshav_school_advance_-10');

    expect(id1).toBe(id2);
    expect(id1).toBeGreaterThan(0);
    expect(id1).toBeLessThan(2147483647);
    expect(id1).not.toBe(id3);
  });

  it('evaluates midnight-crossing quiet hours accurately', () => {
    // Quiet hours: 22:00 to 06:00
    expect(isQuietHour('22:00', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('23:30', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('02:00', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('05:59', '22:00', '06:00')).toBe(true);
    expect(isQuietHour('06:00', '22:00', '06:00')).toBe(false);
    expect(isQuietHour('09:00', '22:00', '06:00')).toBe(false);
    expect(isQuietHour('21:59', '22:00', '06:00')).toBe(false);
  });

  it('computes 72-hour rolling notification schedule from routine templates', () => {
    // Generate schedule for future dates
    const baseDate = '2030-01-01';
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime());
    const schedule = NotificationManager.compute72HourSchedule(
      templates,
      [],
      prefs,
      baseDate
    );

    expect(schedule.length).toBeGreaterThan(0);

    // Verify properties of scheduled items
    const first = schedule[0];
    expect(first.id).toBeGreaterThan(0);
    expect(first.title).toContain('Routine:');
    expect(first.actionTypeId).toBe('ROUTINE_ACTIONS');
    expect(first.extra?.templateId).toBeDefined();
    expect(first.extra?.date).toBeDefined();

    // Verify chronological ordering
    for (let i = 0; i < schedule.length - 1; i++) {
      expect(schedule[i].scheduledTimestamp).toBeLessThanOrEqual(
        schedule[i + 1].scheduledTimestamp
      );
    }
  });

  it('silences notifications scheduled during quiet hours', () => {
    // Create a template explicitly scheduled at 02:00 AM
    const lateNightTemplate = {
      ...templates[0],
      id: 'template_late_night',
      startTime: '02:00',
      endTime: '02:30',
      notifications: [{ id: 'notif_late', type: 'start' as const, offsetMinutes: 0, enabled: true }],
    };

    const baseDate = '2030-01-01';
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime());
    const scheduleWithQuiet = NotificationManager.compute72HourSchedule(
      [lateNightTemplate],
      [],
      { ...prefs, quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '06:00' },
      baseDate
    );

    // Should be filtered out due to quiet hours
    expect(scheduleWithQuiet).toHaveLength(0);

    // If quiet hours are disabled, it should be scheduled
    const scheduleWithoutQuiet = NotificationManager.compute72HourSchedule(
      [lateNightTemplate],
      [],
      { ...prefs, quietHoursEnabled: false },
      baseDate
    );
    expect(scheduleWithoutQuiet.length).toBeGreaterThan(0);
  });
});
