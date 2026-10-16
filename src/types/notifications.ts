import { z } from 'zod';

export const NotificationPreferencesSchema = z.object({
  userId: z.string(),
  soundEnabled: z.boolean().default(true),
  vibrationEnabled: z.boolean().default(true),
  quietHoursEnabled: z.boolean().default(true),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('22:00'),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('06:00'),
  snoozeDurationMinutes: z.number().min(1).max(60).default(10),
  defaultAdvanceReminders: z.array(z.number()).default([-10]),
  updatedAt: z.number().default(Date.now()),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export interface ScheduledNotificationItem {
  id: number; // 32-bit integer for Capacitor LocalNotifications
  occurrenceId: string;
  triggerType: 'advance' | 'start' | 'end' | 'snooze';
  scheduledTimestamp: number;
  title: string;
  body: string;
  actionTypeId?: string;
  extra?: {
    templateId: string;
    date: string;
    triggerType: string;
  };
}
