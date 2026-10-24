import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { RoutineTemplate } from '@/types/routine';
import { getInitialRoutineTemplates } from './seed-data';

export const DEFAULT_WEEKDAY_TEMPLATE_ID_PREFIX = 'tpl_weekday_';
export const DEFAULT_WEEKEND_TEMPLATE_ID_PREFIX = 'tpl_weekend_';

export function getWeekendRoutineBlocks(userId: string): RoutineTemplate[] {
  const now = Date.now();
  const startDate = '2026-01-01';

  return [
    {
      id: `w_block_wake_${userId}`,
      userId,
      title: 'Relaxed Wake-up & Hydration',
      category: 'health',
      startTime: '07:00',
      endTime: '07:30',
      isFixed: true,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [
        { id: 'notif_w_wake_0', type: 'start', offsetMinutes: 0, enabled: true },
      ],
      notes: 'Gentle start, water hydration, light stretching',
      color: '#f59e0b',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_mindfulness_${userId}`,
      userId,
      title: 'Morning Walk & Breathwork',
      category: 'mindfulness',
      startTime: '07:30',
      endTime: '08:15',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [
        { id: 'notif_w_mind_0', type: 'start', offsetMinutes: 0, enabled: true },
      ],
      notes: 'Fresh morning air, peaceful mindfulness, deep breaths',
      color: '#10b981',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_breakfast_${userId}`,
      userId,
      title: 'Leisurely Breakfast',
      category: 'health',
      startTime: '08:15',
      endTime: '09:00',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [],
      notes: 'Nutritious breakfast with family',
      color: '#06b6d4',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_cycling_${userId}`,
      userId,
      title: 'Cycling & Outdoor Fitness',
      category: 'fitness',
      startTime: '09:00',
      endTime: '11:00',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [
        { id: 'notif_w_cycle_0', type: 'start', offsetMinutes: 0, enabled: true },
      ],
      notes: 'Scenic cycling route or endurance ride, track pace with speedometer',
      color: '#f97316',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_creative_${userId}`,
      userId,
      title: 'Fullmoon Styles & Creative Studio',
      category: 'business',
      startTime: '11:00',
      endTime: '12:30',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [
        { id: 'notif_w_creative_0', type: 'start', offsetMinutes: 0, enabled: true },
      ],
      notes: 'Creative designs, brand initiatives, innovative project exploration',
      color: '#ec4899',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_lunch_${userId}`,
      userId,
      title: 'Lunch & Relax',
      category: 'health',
      startTime: '12:30',
      endTime: '13:30',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [],
      notes: 'Balanced lunch, mindful pause',
      color: '#14b8a6',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_nap_${userId}`,
      userId,
      title: 'Rest & Reading',
      category: 'rest',
      startTime: '13:30',
      endTime: '14:30',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [],
      notes: 'Quiet reading or refreshing afternoon power rest',
      color: '#8b5cf6',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_learning_${userId}`,
      userId,
      title: 'Personal Projects & Skill Mastery',
      category: 'learning',
      startTime: '14:30',
      endTime: '16:30',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [
        { id: 'notif_w_learn_0', type: 'start', offsetMinutes: 0, enabled: true },
      ],
      notes: 'Coding side projects, deep curiosity learning, book synthesis',
      color: '#6366f1',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_family_${userId}`,
      userId,
      title: 'Family Time & Outdoor Leisure',
      category: 'family',
      startTime: '16:30',
      endTime: '18:30',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [
        { id: 'notif_w_fam_0', type: 'start', offsetMinutes: 0, enabled: true },
      ],
      notes: 'Quality time with family, outing, games, or social visit',
      color: '#eab308',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_dinner_${userId}`,
      userId,
      title: 'Dinner & Evening Conversation',
      category: 'health',
      startTime: '18:30',
      endTime: '20:00',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [],
      notes: 'Relaxed dinner together',
      color: '#06b6d4',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_reflection_${userId}`,
      userId,
      title: 'Weekly Reflection & Goal Planning',
      category: 'mindfulness',
      startTime: '20:00',
      endTime: '21:00',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [
        { id: 'notif_w_refl_0', type: 'start', offsetMinutes: 0, enabled: true },
      ],
      notes: 'Review accomplishments, review Life Goals roadmap, align for upcoming week',
      color: '#10b981',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `w_block_winddown_${userId}`,
      userId,
      title: 'Digital Wind-Down & Sleep',
      category: 'rest',
      startTime: '21:00',
      endTime: '22:30',
      isFixed: false,
      recurrence: {
        frequency: 'weekends',
        daysOfWeek: [0, 6],
        startDate,
        exceptions: [],
      },
      notifications: [],
      notes: 'Dim lights, disconnect screens, prepare for deep restorative rest',
      color: '#64748b',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function getDefaultDayTemplates(userId: string): DayRoutineTemplate[] {
  const now = Date.now();
  const weekdayId = `${DEFAULT_WEEKDAY_TEMPLATE_ID_PREFIX}${userId}`;
  const weekendId = `${DEFAULT_WEEKEND_TEMPLATE_ID_PREFIX}${userId}`;

  const weekdayBlocks = getInitialRoutineTemplates(userId);
  const weekendBlocks = getWeekendRoutineBlocks(userId);

  return [
    {
      id: weekdayId,
      userId,
      name: 'Default Weekday Routine',
      description: 'Structured weekday schedule with deep work sessions, focus blocks, and mindfulness',
      color: '#3b82f6',
      icon: 'briefcase',
      blocks: weekdayBlocks,
      isDefault: true,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: weekendId,
      userId,
      name: 'Weekend Routine',
      description: 'Relaxed morning, Fullmoon Styles, cycling workout, personal projects, and family time',
      color: '#10b981',
      icon: 'sun',
      blocks: weekendBlocks,
      isDefault: false,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function getDefaultWeeklyPlanner(
  userId: string,
  defaultTemplateId: string,
  weekendTemplateId?: string
): WeeklyPlannerConfig {
  const weekendId = weekendTemplateId || defaultTemplateId;

  return {
    userId,
    assignments: {
      '1': defaultTemplateId, // Monday
      '2': defaultTemplateId, // Tuesday
      '3': defaultTemplateId, // Wednesday
      '4': defaultTemplateId, // Thursday
      '5': defaultTemplateId, // Friday
      '6': weekendId,         // Saturday
      '0': weekendId,         // Sunday
    },
    defaultTemplateId,
    dateOverrides: {},
    updatedAt: Date.now(),
  };
}
