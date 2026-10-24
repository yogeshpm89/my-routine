import { z } from 'zod';

export const GoalTrackingUnitSchema = z.enum([
  'minutes',
  'km',
  'chapters',
  'pages',
  'topics',
  'modules',
]);
export type GoalTrackingUnit = z.infer<typeof GoalTrackingUnitSchema>;

export const GoalProgressSourceSchema = z.enum([
  'manual',
  'routine_completion',
  'timer',
  'quick_add',
]);
export type GoalProgressSource = z.infer<typeof GoalProgressSourceSchema>;

export const GoalProgressEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  goalId: z.string().min(1, 'Goal ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  minutes: z.number().int().nonnegative('Minutes must be non-negative integer'),
  durationMinutes: z.number().int().optional(),
  amount: z.number().optional(),
  unit: GoalTrackingUnitSchema.default('minutes'),
  unitValue: z.number().positive().optional(),
  source: GoalProgressSourceSchema.default('manual'),
  routineLogId: z.string().optional(),
  note: z.string().default(''),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type GoalProgressEntry = z.infer<typeof GoalProgressEntrySchema>;

export interface CalculatedGoalProgress {
  targetMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  rawPercentage: number;
  displayPercentage: number;
  isAchieved: boolean;
  isOverTarget: boolean;
  overTargetMinutes: number;
  primaryUnit?: GoalTrackingUnit;
  totalUnitValue?: number;
}
