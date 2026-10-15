import { describe, it, expect } from 'vitest';
import { generateDailyOccurrences, matchesRecurrence } from './occurrence-generator';
import { getInitialRoutineTemplates } from './seed-data';
import { OccurrenceOverride, ActivityLog } from '@/types/routine';

describe('Occurrence Generator & Recurrence Rules', () => {
  const templates = getInitialRoutineTemplates('test-user');

  it('matches weekday templates on Monday (2026-10-19)', () => {
    // 2026-10-19 is a Monday
    const monday = '2026-10-19';
    const occurrences = generateDailyOccurrences(templates, [], [], monday);
    
    // Keshav's school routine is a weekday routine and should be present
    const school = occurrences.find((o) => o.templateId === 'template_keshav_school');
    expect(school).toBeDefined();
    expect(school?.startTime).toBe('07:30');
    expect(school?.endTime).toBe('08:30');
  });

  it('excludes weekday templates on Sunday (2026-10-18)', () => {
    // 2026-10-18 is a Sunday
    const sunday = '2026-10-18';
    const occurrences = generateDailyOccurrences(templates, [], [], sunday);

    // School routine should NOT appear on Sunday
    const school = occurrences.find((o) => o.templateId === 'template_keshav_school');
    expect(school).toBeUndefined();

    // Daily routines like meditation SHOULD appear
    const meditation = occurrences.find((o) => o.templateId === 'template_meditation');
    expect(meditation).toBeDefined();
  });

  it('applies single occurrence override correctly', () => {
    const monday = '2026-10-19';
    const override: OccurrenceOverride = {
      id: 'override_1',
      userId: 'test-user',
      templateId: 'template_meditation',
      date: monday,
      modifiedStartTime: '06:15',
      modifiedEndTime: '06:45',
      modifiedTitle: 'Deep Guided Meditation',
      isCancelled: false,
      isPostponed: false,
      updatedAt: Date.now(),
    };

    const occurrences = generateDailyOccurrences(templates, [override], [], monday);
    const meditation = occurrences.find((o) => o.templateId === 'template_meditation');

    expect(meditation).toBeDefined();
    expect(meditation?.startTime).toBe('06:15');
    expect(meditation?.endTime).toBe('06:45');
    expect(meditation?.title).toBe('Deep Guided Meditation');
    expect(meditation?.hasOverride).toBe(true);
  });

  it('excludes cancelled occurrence override', () => {
    const monday = '2026-10-19';
    const cancelOverride: OccurrenceOverride = {
      id: 'override_cancel',
      userId: 'test-user',
      templateId: 'template_power_nap',
      date: monday,
      isCancelled: true,
      isPostponed: false,
      updatedAt: Date.now(),
    };

    const occurrences = generateDailyOccurrences(templates, [cancelOverride], [], monday);
    const nap = occurrences.find((o) => o.templateId === 'template_power_nap');
    expect(nap).toBeUndefined();
  });

  it('attaches execution logs to occurrences', () => {
    const monday = '2026-10-19';
    const log: ActivityLog = {
      id: `${monday}_template_meditation`,
      userId: 'test-user',
      templateId: 'template_meditation',
      date: monday,
      status: 'completed',
      actualStartTime: '06:10',
      actualEndTime: '06:42',
      actualDurationMinutes: 32,
      targetDurationMinutes: 30,
      completionNotes: 'Felt very centered',
      updatedAt: Date.now(),
    };

    const occurrences = generateDailyOccurrences(templates, [], [log], monday);
    const meditation = occurrences.find((o) => o.templateId === 'template_meditation');
    expect(meditation?.log?.status).toBe('completed');
    expect(meditation?.log?.actualDurationMinutes).toBe(32);
    expect(meditation?.log?.completionNotes).toBe('Felt very centered');
  });
});
