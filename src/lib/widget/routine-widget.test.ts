import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncOccurrencesToWidget, RoutineWidget } from './routine-widget';
import { ActivityOccurrence, ActivityLog } from '@/types/routine';

describe('RoutineWidget Plugin & Sync Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const createMockOccurrence = (
    id: string,
    title: string,
    startTime: string,
    endTime: string,
    status?: ActivityLog['status']
  ): ActivityOccurrence => {
    const log: ActivityLog | undefined = status
      ? {
          id: `log-${id}`,
          userId: 'user-1',
          templateId: id,
          date: '2026-10-20',
          status,
          actualDurationMinutes: 30,
          targetDurationMinutes: 30,
          completionNotes: '',
          updatedAt: 1000,
        }
      : undefined;

    return {
      occurrenceId: `occ-${id}`,
      templateId: id,
      date: '2026-10-20',
      title,
      category: 'health',
      startTime,
      endTime,
      durationMinutes: 30,
      isFixed: false,
      notes: '',
      color: '#3b82f6',
      notifications: [],
      hasOverride: false,
      isCancelled: false,
      isPostponed: false,
      log,
      template: {
        id,
        userId: 'user-1',
        title,
        category: 'health',
        startTime,
        endTime,
        isFixed: false,
        recurrence: {
          frequency: 'daily',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startDate: '2026-10-20',
          exceptions: [],
        },
        notifications: [],
        notes: '',
        color: '#3b82f6',
        timezone: 'Asia/Kolkata',
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    };
  };

  const mockOccurrences: ActivityOccurrence[] = [
    createMockOccurrence('tpl-1', 'Morning Yoga', '07:00', '07:30', 'completed'),
    createMockOccurrence('tpl-2', 'Meditation & Breathwork', '07:30', '08:00', 'in_progress'),
    createMockOccurrence('tpl-3', 'Deep Work Session', '09:00', '11:00'),
  ];

  it('correctly calculates metrics and syncs to widget data', async () => {
    const updateSpy = vi.spyOn(RoutineWidget, 'updateWidgetData');

    await syncOccurrencesToWidget(mockOccurrences, 'Daily Focus');

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const payload = updateSpy.mock.calls[0][0];

    expect(payload.routineTitle).toBe('Daily Focus');
    expect(payload.totalCount).toBe(3);
    expect(payload.completedCount).toBe(1);
    expect(payload.progressPercent).toBe(33);
    expect(payload.isAllCompleted).toBe(false);
    expect(payload.isSkipped).toBe(false);
  });

  it('marks isAllCompleted when all activities are done', async () => {
    const allDoneOccurrences: ActivityOccurrence[] = [
      createMockOccurrence('tpl-1', 'Morning Yoga', '07:00', '07:30', 'completed'),
      createMockOccurrence('tpl-2', 'Meditation', '07:30', '08:00', 'completed'),
      createMockOccurrence('tpl-3', 'Deep Work', '09:00', '11:00', 'completed'),
    ];

    const updateSpy = vi.spyOn(RoutineWidget, 'updateWidgetData');
    await syncOccurrencesToWidget(allDoneOccurrences, 'Done Routine');

    const payload = updateSpy.mock.calls[0][0];
    expect(payload.totalCount).toBe(3);
    expect(payload.completedCount).toBe(3);
    expect(payload.progressPercent).toBe(100);
    expect(payload.isAllCompleted).toBe(true);
    expect(payload.statusText).toBe('100% Done');
  });

  it('handles completely skipped day routine', async () => {
    const skippedOccurrences: ActivityOccurrence[] = [
      createMockOccurrence('tpl-1', 'Morning Yoga', '07:00', '07:30', 'skipped'),
      createMockOccurrence('tpl-2', 'Meditation', '07:30', '08:00', 'skipped'),
      createMockOccurrence('tpl-3', 'Deep Work', '09:00', '11:00', 'skipped'),
    ];

    const updateSpy = vi.spyOn(RoutineWidget, 'updateWidgetData');
    await syncOccurrencesToWidget(skippedOccurrences, 'Holiday');

    const payload = updateSpy.mock.calls[0][0];
    expect(payload.isSkipped).toBe(true);
    expect(payload.statusText).toBe('Skipped');
  });

  it('handles empty occurrence array gracefully without errors', async () => {
    const updateSpy = vi.spyOn(RoutineWidget, 'updateWidgetData');
    await syncOccurrencesToWidget([], 'Empty Day');

    const payload = updateSpy.mock.calls[0][0];
    expect(payload.totalCount).toBe(0);
    expect(payload.completedCount).toBe(0);
    expect(payload.progressPercent).toBe(0);
  });
});
