import { z } from 'zod';

export const RecurrenceFrequencySchema = z.enum([
  'once',
  'daily',
  'weekly',
  'weekdays',
  'weekends',
  'custom',
]);
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>;

export const RecurrenceRuleSchema = z.object({
  frequency: RecurrenceFrequencySchema,
  daysOfWeek: z.array(z.number().min(0).max(6)).default([]), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  exceptions: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
});
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;

export const NotificationRuleSchema = z.object({
  id: z.string(),
  type: z.enum(['advance', 'start', 'end']),
  offsetMinutes: z.number(), // e.g. -10 for 10 min before, 0 for at start, 0 for at end
  enabled: z.boolean().default(true),
});
export type NotificationRule = z.infer<typeof NotificationRuleSchema>;

export const ActivityCategorySchema = z.enum([
  'work',
  'mindfulness',
  'learning',
  'family',
  'health',
  'business',
  'fitness',
  'rest',
  'personal',
  'buffer',
  'other',
]);
export type ActivityCategory = z.infer<typeof ActivityCategorySchema>;

export const MediaAttachmentTypeSchema = z.enum([
  'youtube',
  'audio_url',
  'video_url',
  'local_file',
]);
export type MediaAttachmentType = z.infer<typeof MediaAttachmentTypeSchema>;

export const MediaAttachmentSchema = z.object({
  id: z.string(),
  type: MediaAttachmentTypeSchema,
  title: z.string().optional(),
  url: z.string().optional(), // YouTube or streaming audio/video URL
  localKey: z.string().optional(), // Key in IndexedDB for downloaded/local files
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  createdAt: z.number().default(() => Date.now()),
});
export type MediaAttachment = z.infer<typeof MediaAttachmentSchema>;

export const RoutineTemplateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1, 'Title is required'),
  category: ActivityCategorySchema.default('personal'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be HH:mm'),
  isFixed: z.boolean().default(false), // Protected from auto-shift/overlap
  recurrence: RecurrenceRuleSchema,
  notifications: z.array(NotificationRuleSchema).default([]),
  media: z.array(MediaAttachmentSchema).optional(),
  notes: z.string().default(''),
  color: z.string().default('#3b82f6'),
  timezone: z.string().default('Asia/Kolkata'),
  isArchived: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type RoutineTemplate = z.infer<typeof RoutineTemplateSchema>;

export const OccurrenceOverrideSchema = z.object({
  id: z.string(),
  userId: z.string(),
  templateId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  modifiedStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  modifiedEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  modifiedTitle: z.string().optional(),
  isCancelled: z.boolean().default(false),
  isPostponed: z.boolean().default(false),
  postponedToDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
  modifiedMedia: z.array(MediaAttachmentSchema).optional(),
  updatedAt: z.number(),
});
export type OccurrenceOverride = z.infer<typeof OccurrenceOverrideSchema>;

export const ActivityStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'partial',
  'skipped',
  'postponed',
]);
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

export const ActivityLogSchema = z.object({
  id: z.string(), // format: `${date}_${templateId}`
  userId: z.string(),
  templateId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: ActivityStatusSchema.default('pending'),
  actualStartTime: z.string().optional(), // ISO string or HH:mm
  actualEndTime: z.string().optional(),
  actualDurationMinutes: z.number().default(0),
  targetDurationMinutes: z.number().default(0),
  completionNotes: z.string().default(''),
  updatedAt: z.number(),
});
export type ActivityLog = z.infer<typeof ActivityLogSchema>;

export const GoalTargetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1),
  categories: z.array(z.string()).default([]),
  templateIds: z.array(z.string()).default([]),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  targetMinutes: z.number().min(1),
  minMinutes: z.number().optional(),
  maxMinutes: z.number().optional(),
  targetTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), // e.g. wake-up time 06:00
  activeDays: z.array(z.number().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  isArchived: z.boolean().default(false),
  updatedAt: z.number(),
});
export type GoalTarget = z.infer<typeof GoalTargetSchema>;

// Computed Activity Occurrence for a specific day
export interface ActivityOccurrence {
  occurrenceId: string; // `${templateId}_${date}`
  templateId: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: ActivityCategory;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  isFixed: boolean;
  notes: string;
  color: string;
  notifications: NotificationRule[];
  media?: MediaAttachment[];
  hasOverride: boolean;
  isCancelled: boolean;
  isPostponed: boolean;
  log?: ActivityLog;
  template: RoutineTemplate;
}

export type EditScope = 'this_occurrence' | 'future_occurrences' | 'all_occurrences';
