import { describe, it, expect, beforeEach } from 'vitest';
import { RoutineTemplate, OccurrenceOverride, ActivityLog, TaskStep } from '@/types/routine';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { LogRepository } from '@/lib/repositories/log-repository';

describe('Task Steps & Checklist Feature', () => {
  const userId = 'user_test_steps';

  beforeEach(() => {
    localStorage.clear();
  });

  const mockSteps: TaskStep[] = [
    { id: 's1', text: '5m Warmup', isCompleted: false },
    { id: 's2', text: 'Core Workout', isCompleted: false },
    { id: 's3', text: 'Cooldown Stretch', isCompleted: false },
  ];

  const templateWithSteps: RoutineTemplate = {
    id: 't_fitness',
    userId,
    title: 'Daily Workout',
    category: 'fitness',
    startTime: '07:00',
    endTime: '08:00',
    isFixed: false,
    recurrence: {
      frequency: 'daily',
      startDate: '2026-10-15',
      daysOfWeek: [],
      exceptions: [],
    },
    notifications: [],
    steps: mockSteps,
    notes: 'Stay hydrated',
    color: '#10b981',
    timezone: 'Asia/Kolkata',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('attaches template steps and log completedStepIds to generated occurrences', () => {
    const log: ActivityLog = {
      id: '2026-10-19_t_fitness',
      userId,
      templateId: 't_fitness',
      date: '2026-10-19',
      status: 'in_progress',
      actualDurationMinutes: 30,
      targetDurationMinutes: 60,
      completionNotes: '',
      completedStepIds: ['s1'],
      updatedAt: Date.now(),
    };

    const occurrences = generateDailyOccurrences(
      [templateWithSteps],
      [],
      [log],
      '2026-10-19'
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].steps).toBeDefined();
    expect(occurrences[0].steps!).toHaveLength(3);
    expect(occurrences[0].steps![0].text).toBe('5m Warmup');
    expect(occurrences[0].completedStepIds).toEqual(['s1']);
  });

  it('toggles a step on and off via LogRepository', async () => {
    const updated1 = await LogRepository.toggleStep(userId, '2026-10-19', 't_fitness', 's1');
    expect(updated1.completedStepIds).toContain('s1');
    expect(updated1.status).toBe('in_progress');

    const updated2 = await LogRepository.toggleStep(userId, '2026-10-19', 't_fitness', 's2');
    expect(updated2.completedStepIds).toContain('s1');
    expect(updated2.completedStepIds).toContain('s2');

    // Untoggle s1
    const updated3 = await LogRepository.toggleStep(userId, '2026-10-19', 't_fitness', 's1');
    expect(updated3.completedStepIds).not.toContain('s1');
    expect(updated3.completedStepIds).toContain('s2');
  });

  it('preserves checklist state independently across different dates', async () => {
    await LogRepository.toggleStep(userId, '2026-10-19', 't_fitness', 's1');
    await LogRepository.toggleStep(userId, '2026-10-20', 't_fitness', 's2');

    const logsDay1 = await LogRepository.getLogsForDate(userId, '2026-10-19');
    const logsDay2 = await LogRepository.getLogsForDate(userId, '2026-10-20');

    expect(logsDay1[0].completedStepIds).toEqual(['s1']);
    expect(logsDay2[0].completedStepIds).toEqual(['s2']);
  });

  it('supports single-occurrence modifiedSteps override', () => {
    const customSteps: TaskStep[] = [
      { id: 'cs1', text: 'Custom Outdoor Run', isCompleted: false },
    ];

    const override: OccurrenceOverride = {
      id: 'override_t_fitness_2026-10-19',
      userId,
      templateId: 't_fitness',
      date: '2026-10-19',
      isCancelled: false,
      isPostponed: false,
      modifiedSteps: customSteps,
      updatedAt: Date.now(),
    };

    const occurrences = generateDailyOccurrences(
      [templateWithSteps],
      [override],
      [],
      '2026-10-19'
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].steps).toBeDefined();
    expect(occurrences[0].steps!).toHaveLength(1);
    expect(occurrences[0].steps![0].text).toBe('Custom Outdoor Run');
  });
});
