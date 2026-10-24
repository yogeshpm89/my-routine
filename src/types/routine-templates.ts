import { z } from 'zod';
import { RoutineTemplateSchema, RoutineTemplate } from './routine';

export const DayRoutineTemplateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional().default(''),
  color: z.string().default('#3b82f6'),
  icon: z.string().optional(),
  blocks: z.array(RoutineTemplateSchema).default([]),
  isDefault: z.boolean().default(false),
  schemaVersion: z.number().default(1),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type DayRoutineTemplate = z.infer<typeof DayRoutineTemplateSchema>;

export const DayOfWeekSchema = z.number().min(0).max(6); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export const WeeklyPlannerConfigSchema = z.object({
  userId: z.string(),
  // Mapping day of week "0".."6" to DayRoutineTemplate.id
  assignments: z.record(z.string(), z.string()).default({}),
  defaultTemplateId: z.string(),
  // Date-specific template assignments: "YYYY-MM-DD" -> templateId
  dateOverrides: z.record(z.string(), z.string()).default({}),
  updatedAt: z.number(),
});
export type WeeklyPlannerConfig = z.infer<typeof WeeklyPlannerConfigSchema>;

export const TemplateImportExportSchema = z.object({
  schemaVersion: z.literal(1),
  type: z.literal('my_routine_template'),
  exportedAt: z.string(),
  template: DayRoutineTemplateSchema.omit({ userId: true }),
});
export type TemplateImportExport = z.infer<typeof TemplateImportExportSchema>;
