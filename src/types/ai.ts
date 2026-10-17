import { z } from 'zod';

export const AiOutputFormatSchema = z.enum(['markdown', 'sections', 'checklist']);
export type AiOutputFormat = z.infer<typeof AiOutputFormatSchema>;

export const AiExecutionStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);
export type AiExecutionStatus = z.infer<typeof AiExecutionStatusSchema>;

export const AiActionConfigSchema = z.object({
  id: z.string(),
  userId: z.string(),
  routineId: z.string().nullable().optional(), // Attached routine template ID if applicable
  name: z.string().min(1, 'Action name is required'),
  description: z.string().default(''),
  prompt: z
    .string()
    .min(1, 'Prompt instructions are required')
    .refine((s) => s.trim().length > 0, 'Prompt instructions cannot be only whitespace'),
  outputFormat: AiOutputFormatSchema.default('markdown'),
  requiresUserInput: z.boolean().default(false),
  userInputPlaceholder: z.string().optional(),
  researchEnabled: z.boolean().default(false),
  enabled: z.boolean().default(true),
  schemaVersion: z.number().default(1),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type AiActionConfig = z.infer<typeof AiActionConfigSchema>;

export const AiExecutionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  actionId: z.string(),
  actionName: z.string(),
  routineId: z.string().nullable().optional(),
  routineTitle: z.string().optional(),
  status: AiExecutionStatusSchema.default('queued'),
  promptSnapshot: z.string(),
  inputSnapshot: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  modelMetadata: z
    .object({
      provider: z.string(),
      model: z.string(),
    })
    .nullable()
    .optional(),
  usageMetadata: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .nullable()
    .optional(),
  createdAt: z.number(),
  completedAt: z.number().nullable().optional(),
});
export type AiExecution = z.infer<typeof AiExecutionSchema>;

export const AiSourceCitationSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string().optional(),
  publicationDate: z.string().optional(),
});
export type AiSourceCitation = z.infer<typeof AiSourceCitationSchema>;

export const AiStructuredSectionSchema = z.object({
  title: z.string(),
  body: z.string(),
});
export type AiStructuredSection = z.infer<typeof AiStructuredSectionSchema>;

export const AiChecklistItemSchema = z.object({
  text: z.string(),
  completed: z.boolean().default(false),
});
export type AiChecklistItem = z.infer<typeof AiChecklistItemSchema>;

export const AiResultSchema = z.object({
  id: z.string(),
  userId: z.string(),
  executionId: z.string(),
  actionId: z.string(),
  actionName: z.string(),
  contentFormat: AiOutputFormatSchema.default('markdown'),
  content: z.string(), // Raw markdown or full text
  sections: z.array(AiStructuredSectionSchema).nullable().optional(),
  checklistItems: z.array(AiChecklistItemSchema).nullable().optional(),
  sources: z.array(AiSourceCitationSchema).nullable().optional(),
  createdAt: z.number(),
});
export type AiResult = z.infer<typeof AiResultSchema>;

export interface ExecutionResponse {
  success: boolean;
  execution: AiExecution;
  result?: AiResult;
  error?: string;
}
