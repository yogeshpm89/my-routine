import { describe, it, expect } from 'vitest';
import { detectScheduleConflicts } from './conflict-detector';
import { getInitialRoutineTemplates, getInitialGoalTargets } from './seed-data';
import { generateDailyOccurrences } from './occurrence-generator';
import { ActivityOccurrence } from '@/types/routine';

describe('Conflict Detection & Goal Allocation Engine', () => {
  const templates = getInitialRoutineTemplates('test-user');
  const goals = getInitialGoalTargets('test-user');
  const mondayDate = '2026-10-19'; // Monday (dayOfWeek = 1)

  it('detects no hard collision errors in the default initial routine', () => {
    const occurrences = generateDailyOccurrences(templates, [], [], mondayDate);
    const conflicts = detectScheduleConflicts(occurrences, goals, 1);

    const errors = conflicts.filter((c) => c.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('flags expected goal deficits in initial routine (Fullmoon Styles 90m deficit & Coursera 30m unscheduled)', () => {
    const occurrences = generateDailyOccurrences(templates, [], [], mondayDate);
    const conflicts = detectScheduleConflicts(occurrences, goals, 1);

    // Fullmoon Styles has 30m scheduled block vs 120m target -> 90m deficit
    const fullmoonDeficit = conflicts.find((c) => c.goal?.id === 'goal_fullmoon_meghmalhaar');
    expect(fullmoonDeficit).toBeDefined();
    expect(fullmoonDeficit?.severity).toBe('warning');
    expect(fullmoonDeficit?.deficitMinutes).toBe(90);

    // Coursera has 0m scheduled block vs 30m target -> 30m unscheduled
    const courseraUnscheduled = conflicts.find((c) => c.goal?.id === 'goal_coursera');
    expect(courseraUnscheduled).toBeDefined();
    expect(courseraUnscheduled?.severity).toBe('warning');
    expect(courseraUnscheduled?.deficitMinutes).toBe(30);
  });

  it('raises a hard ERROR when an activity overlaps with a fixed commitment', () => {
    const occurrences = generateDailyOccurrences(templates, [], [], mondayDate);

    // Inject an overlapping activity colliding with Keshav's school routine (07:30 - 08:30, fixed: true)
    const collidingActivity: ActivityOccurrence = {
      occurrenceId: 'colliding_task_monday',
      templateId: 'template_colliding',
      date: mondayDate,
      title: 'Urgent Strategy Call',
      category: 'work',
      startTime: '08:00',
      endTime: '08:45',
      durationMinutes: 45,
      isFixed: false,
      notes: 'Colliding with school routine',
      color: '#ef4444',
      notifications: [],
      hasOverride: false,
      isCancelled: false,
      isPostponed: false,
      template: {
        id: 'template_colliding',
        userId: 'test-user',
        title: 'Urgent Strategy Call',
        category: 'work',
        startTime: '08:00',
        endTime: '08:45',
        isFixed: false,
        recurrence: { frequency: 'once', daysOfWeek: [], startDate: mondayDate, exceptions: [] },
        notifications: [],
        notes: '',
        color: '#ef4444',
        timezone: 'Asia/Kolkata',
        isArchived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };

    const combinedOccurrences = [...occurrences, collidingActivity];
    const conflicts = detectScheduleConflicts(combinedOccurrences, goals, 1);

    const fixedCollisions = conflicts.filter((c) => c.type === 'fixed_collision');
    expect(fixedCollisions.length).toBeGreaterThan(0);
    expect(fixedCollisions[0].severity).toBe('error');
    expect(fixedCollisions[0].title).toContain("Fixed Event Collision");
  });

  it('raises a WARNING when two flexible activities overlap', () => {
    const flexibleOccurrences: ActivityOccurrence[] = [
      {
        occurrenceId: 'occ_flex_1',
        templateId: 'temp_1',
        date: mondayDate,
        title: 'Light Reading',
        category: 'learning',
        startTime: '10:00',
        endTime: '11:00',
        durationMinutes: 60,
        isFixed: false,
        notes: '',
        color: '#3b82f6',
        notifications: [],
        hasOverride: false,
        isCancelled: false,
        isPostponed: false,
        template: {} as any,
      },
      {
        occurrenceId: 'occ_flex_2',
        templateId: 'temp_2',
        date: mondayDate,
        title: 'Audio Podcast',
        category: 'personal',
        startTime: '10:30',
        endTime: '11:30',
        durationMinutes: 60,
        isFixed: false,
        notes: '',
        color: '#10b981',
        notifications: [],
        hasOverride: false,
        isCancelled: false,
        isPostponed: false,
        template: {} as any,
      },
    ];

    const conflicts = detectScheduleConflicts(flexibleOccurrences, [], 1);
    const flexOverlap = conflicts.find((c) => c.type === 'flexible_overlap');
    expect(flexOverlap).toBeDefined();
    expect(flexOverlap?.severity).toBe('warning');
  });

  it('flags rest window encroachment when scheduled late at night', () => {
    const lateNightActivity: ActivityOccurrence[] = [
      {
        occurrenceId: 'occ_late',
        templateId: 'temp_late',
        date: mondayDate,
        title: 'Late Coding Sprint',
        category: 'work',
        startTime: '01:00',
        endTime: '02:30',
        durationMinutes: 90,
        isFixed: false,
        notes: '',
        color: '#ef4444',
        notifications: [],
        hasOverride: false,
        isCancelled: false,
        isPostponed: false,
        template: {} as any,
      },
    ];

    const conflicts = detectScheduleConflicts(lateNightActivity, [], 1);
    const sleepEncroachment = conflicts.find((c) => c.type === 'sleep_window_encroachment');
    expect(sleepEncroachment).toBeDefined();
    expect(sleepEncroachment?.severity).toBe('warning');
  });
});
