import { z } from 'zod';

export const GoalDomainSchema = z.enum(['personal', 'professional']);
export type GoalDomain = z.infer<typeof GoalDomainSchema>;

export const GoalCategorySchema = z.string().default('other');
export type GoalCategory = string;

// Universal Tracking Modes
export const GoalTrackingModeSchema = z.enum([
  'milestones', // Step-by-step small milestones
  'phases',    // Multi-stage roadmap progression
  'tasks',     // Tasks & checklist completion %
  'metric',    // Traditional numeric target (books, kg, savings, etc.)
  'items',     // Detailed tracked items (books, courses, projects)
  'habits',    // Daily routine activity streaks & consistency
  'journey',   // Open-ended qualitative journey tracked via experiences & reflections
]);
export type GoalTrackingMode = z.infer<typeof GoalTrackingModeSchema>;

export const GoalMetricTypeSchema = z.enum([
  'numeric',   // Count of items
  'milestone', // Step-by-step phases
  'decrement', // Weight loss, debt reduction
  'boolean',   // Single milestone
]);
export type GoalMetricType = z.infer<typeof GoalMetricTypeSchema>;

export const GoalStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
  'on_hold',
  'archived',
]);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const GoalPrioritySchema = z.enum([
  'critical', // Urgent / P0
  'high',     // Important / P1
  'medium',   // Standard / P2
  'low',      // Nice-to-have / P3
]);
export type GoalPriority = z.infer<typeof GoalPrioritySchema>;

export const GoalMilestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Milestone title is required'),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  isCompleted: z.boolean().default(false),
  completedAt: z.number().optional(),
});
export type GoalMilestone = z.infer<typeof GoalMilestoneSchema>;

export const GoalChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Task text is required'),
  isCompleted: z.boolean().default(false),
  completedAt: z.number().optional(),
});
export type GoalChecklistItem = z.infer<typeof GoalChecklistItemSchema>;

// Multi-stage Phase / Roadmap
export const GoalPhaseSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Phase title is required'),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).default('not_started'),
  targetDate: z.string().optional(),
  tasks: z.array(GoalChecklistItemSchema).default([]),
  completedAt: z.number().optional(),
});
export type GoalPhase = z.infer<typeof GoalPhaseSchema>;

// Multiple Custom / Titled Lists (e.g. Action Items, Resources, Reading List, Ideas)
export const GoalNamedListSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'List title is required'),
  type: z.enum(['checklist', 'resources', 'ideas', 'reading', 'custom']).default('checklist'),
  items: z.array(GoalChecklistItemSchema).default([]),
});
export type GoalNamedList = z.infer<typeof GoalNamedListSchema>;

// Rich Experience & Reflection Journal
export const GoalExperienceEntrySchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1, 'Title or key highlight is required'),
  content: z.string().min(1, 'Reflection content is required'),
  type: z.enum(['reflection', 'breakthrough', 'blocker', 'milestone', 'retro', 'general']).default('reflection'),
  moodRating: z.number().min(1).max(5).optional(), // 1 to 5 rating
  tags: z.array(z.string()).default([]),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().optional(),
});
export type GoalExperienceEntry = z.infer<typeof GoalExperienceEntrySchema>;

export const GoalCommentSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Note text is required'),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().optional(),
});
export type GoalComment = z.infer<typeof GoalCommentSchema>;

export const GoalActivityRecordSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activityTitle: z.string(),
  templateId: z.string().optional(),
  durationMinutes: z.number().default(0),
  notes: z.string().optional().default(''),
  completedAt: z.number().default(() => Date.now()),
});
export type GoalActivityRecord = z.infer<typeof GoalActivityRecordSchema>;

export const GoalProgressLogSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valueChange: z.number(),
  currentValue: z.number(),
  note: z.string().default(''),
  createdAt: z.number().default(() => Date.now()),

  // Minor / Item-Level Progress Attribution (Optional)
  itemId: z.string().optional(),
  itemTitle: z.string().optional(),
  unitLabel: z.string().optional(),
  phaseId: z.string().optional(),
  phaseTitle: z.string().optional(),
  itemCurrentUnits: z.number().optional(),
  itemTotalUnits: z.number().optional(),
  milestoneId: z.string().optional(),
  milestoneTitle: z.string().optional(),
  stepId: z.string().optional(),
  stepTitle: z.string().optional(),
});
export type GoalProgressLog = z.infer<typeof GoalProgressLogSchema>;

// Flexible Custom Fields (Key-Value metadata e.g. Platform: Coursera, Genre: Sci-Fi)
export const GoalCustomFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Field name is required'),
  value: z.string().default(''),
});
export type GoalCustomField = z.infer<typeof GoalCustomFieldSchema>;

// Flexible Links & Local File Paths
export const GoalItemLinkSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Link title is required'),
  urlOrPath: z.string().min(1, 'URL or file path is required'),
  type: z.enum(['web_link', 'audio_link', 'local_file', 'video_link', 'document', 'other']).default('web_link'),
});
export type GoalItemLink = z.infer<typeof GoalItemLinkSchema>;

// Detailed Tracked Items (e.g. Books, Courses, Projects)
export const GoalTrackedItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  itemType: z.enum(['book', 'course', 'project', 'resource', 'other']).default('other'),
  authorOrInstructor: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).default('in_progress'),

  currentUnits: z.number().default(0),
  totalUnits: z.number().default(0),
  unitLabel: z.string().default('pages'),

  summary: z.string().optional().default(''),
  notes: z.string().optional().default(''),

  primaryLink: z.string().optional(),
  audioLinkOrPath: z.string().optional(),
  localFilePath: z.string().optional(),
  links: z.array(GoalItemLinkSchema).optional(),

  customFields: z.array(GoalCustomFieldSchema).optional(),
  quickIncrements: z.array(z.number()).optional(),

  rating: z.number().min(1).max(5).optional(),
  completedAt: z.number().optional(),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});
export type GoalTrackedItem = z.infer<typeof GoalTrackedItemSchema>;

export const LifeGoalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  motivation: z.string().optional(), // "Why this goal matters" / personal drive
  domain: GoalDomainSchema.default('personal'),
  category: z.string().default('other'), // Flexible custom category/tag
  priority: GoalPrioritySchema.optional(),
  trackingMode: GoalTrackingModeSchema.optional(),

  // Optional Numerical Metric targets
  metricType: GoalMetricTypeSchema.optional(),
  startValue: z.number().default(0),
  currentValue: z.number().default(0),
  targetValue: z.number().default(1),
  unit: z.string().default(''),

  // Structured Phases / Roadmap
  phases: z.array(GoalPhaseSchema).optional(),

  // Multiple Titled / Categorized Lists
  lists: z.array(GoalNamedListSchema).optional(),

  // Experience & Reflection Journal
  experiences: z.array(GoalExperienceEntrySchema).optional(),

  // Backward-compatible Flat Milestones & Checklist
  milestones: z.array(GoalMilestoneSchema).optional(),
  checklist: z.array(GoalChecklistItemSchema).optional(),

  // General Comments / Notes
  comments: z.array(GoalCommentSchema).optional(),

  // Detailed Tracked Items (e.g. Books, Courses)
  items: z.array(GoalTrackedItemSchema).optional(),

  // Flexible Goal-level Custom Fields & Links
  customFields: z.array(GoalCustomFieldSchema).optional(),
  links: z.array(GoalItemLinkSchema).optional(),

  // Timeline & Target Deadlines
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeframeLabel: z.string().optional(),

  // Progress Log Entries / Journal
  progressLogs: z.array(GoalProgressLogSchema).default([]),

  // Daily Activity History & Routine Sync
  linkedTemplateIds: z.array(z.string()).optional(),
  activityRecords: z.array(GoalActivityRecordSchema).optional(),
  autoTrackFromActivities: z.boolean().optional(),

  status: GoalStatusSchema.default('in_progress'),
  color: z.string().default('#3b82f6'),

  createdAt: z.number(),
  updatedAt: z.number(),
});
export type LifeGoal = z.infer<typeof LifeGoalSchema>;
