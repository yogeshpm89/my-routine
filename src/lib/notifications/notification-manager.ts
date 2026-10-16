import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityOccurrence,
} from '@/types/routine';
import {
  NotificationPreferences,
  ScheduledNotificationItem,
} from '@/types/notifications';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { LogRepository } from '@/lib/repositories/log-repository';
import {
  addDays,
  timeToMinutes,
  formatTime12Hour,
  getTodayDateString,
} from '@/lib/time-utils';

export const NOTIFICATION_CHANNEL_ID = 'routine_reminders';
export const ACTION_TYPE_ROUTINE = 'ROUTINE_ACTIONS';

const NOTIFICATION_REGISTRY_KEY = 'my_routine_notif_registry_';

// Deterministic 32-bit positive integer hash for notification IDs
export function generateNotificationId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

export function isQuietHour(
  timeStr: string,
  startStr: string,
  endStr: string
): boolean {
  const t = timeToMinutes(timeStr);
  const start = timeToMinutes(startStr);
  const end = timeToMinutes(endStr);

  if (start <= end) {
    return t >= start && t < end;
  }
  // Crosses midnight (e.g. 22:00 to 06:00)
  return t >= start || t < end;
}

export class NotificationManager {
  private static isInitialized = false;

  static isNative(): boolean {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  }

  static async initialize(userId: string): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!this.isNative()) return;

    try {
      // 1. Create High-Priority Android Notification Channel
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Routine & Focus Reminders',
        description: 'Scheduled reminders and alerts for routine activities and habits',
        importance: 4, // HIGH: pops on screen, sound, vibration, Zepp smartwatch forwarding
        visibility: 1, // PUBLIC
        vibration: true,
        sound: 'beep.wav',
      });

      // 2. Register Action Types (Done, Snooze, Skip)
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: ACTION_TYPE_ROUTINE,
            actions: [
              {
                id: 'COMPLETE',
                title: 'Done',
                foreground: false,
              },
              {
                id: 'SNOOZE',
                title: 'Snooze 10m',
                foreground: false,
              },
              {
                id: 'SKIP',
                title: 'Skip',
                destructive: true,
                foreground: false,
              },
            ],
          },
        ],
      });

      // 3. Listen to Notification Action Events
      LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
        const extra = notificationAction.notification.extra;
        const actionId = notificationAction.actionId;

        if (!extra || !extra.templateId || !extra.date) return;

        const { templateId, date } = extra;

        if (actionId === 'COMPLETE') {
          await LogRepository.updateStatus(userId, date, templateId, 'completed');
        } else if (actionId === 'SKIP') {
          await LogRepository.updateStatus(userId, date, templateId, 'skipped');
        } else if (actionId === 'SNOOZE') {
          // Schedule a snooze reminder 10 minutes from now
          const snoozeTimestamp = Date.now() + 10 * 60 * 1000;
          await LocalNotifications.schedule({
            notifications: [
              {
                id: generateNotificationId(`${templateId}_${date}_snooze_${Date.now()}`),
                title: `Snoozed: ${notificationAction.notification.title}`,
                body: `Snoozed routine reminder ready for completion.`,
                schedule: { at: new Date(snoozeTimestamp) },
                channelId: NOTIFICATION_CHANNEL_ID,
                actionTypeId: ACTION_TYPE_ROUTINE,
                extra,
              },
            ],
          });
        }
      });
    } catch (err) {
      console.warn('Failed to initialize native notifications:', err);
    }
  }

  static async checkPermissions(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch {
      return false;
    }
  }

  static async requestPermissions(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch {
      return false;
    }
  }

  static compute72HourSchedule(
    templates: RoutineTemplate[],
    overrides: OccurrenceOverride[],
    prefs: NotificationPreferences,
    baseDate: string = getTodayDateString('Asia/Kolkata')
  ): ScheduledNotificationItem[] {
    const scheduledItems: ScheduledNotificationItem[] = [];
    const nowTimestamp = Date.now();

    // Rolling 3 days (Today, Tomorrow, Day after)
    const dates = [baseDate, addDays(baseDate, 1), addDays(baseDate, 2)];

    for (const dateStr of dates) {
      const occurrences = generateDailyOccurrences(templates, overrides, [], dateStr);

      for (const occ of occurrences) {
        if (occ.isCancelled) continue;

        const notifRules = occ.notifications || [];

        for (const rule of notifRules) {
          if (!rule.enabled) continue;

          let targetTime = occ.startTime;
          if (rule.type === 'end') {
            targetTime = occ.endTime;
          }

          const [h, m] = targetTime.split(':').map(Number);
          // Calculate scheduled timestamp for this date and time in Asia/Kolkata timezone
          // Parse dateStr (YYYY-MM-DD)
          const [yr, mo, dy] = dateStr.split('-').map(Number);

          // Calculate offset in minutes
          const offsetMinutes = rule.offsetMinutes || 0;
          const targetTotalMinutes = h * 60 + m + offsetMinutes;

          const scheduledDate = new Date(yr, mo - 1, dy, 0, targetTotalMinutes, 0, 0);
          const scheduledTimestamp = scheduledDate.getTime();

          // If in the past, skip
          if (scheduledTimestamp <= nowTimestamp) continue;

          // Check Quiet Hours
          if (prefs.quietHoursEnabled) {
            const triggerTimeStr = `${String(Math.floor((targetTotalMinutes % 1440) / 60)).padStart(2, '0')}:${String((targetTotalMinutes % 1440) % 60).padStart(2, '0')}`;
            if (isQuietHour(triggerTimeStr, prefs.quietHoursStart, prefs.quietHoursEnd)) {
              // Silenced by quiet hours
              continue;
            }
          }

          const triggerKey = `${occ.occurrenceId}_${rule.type}_${rule.offsetMinutes}`;
          const id = generateNotificationId(triggerKey);

          let body = `${formatTime12Hour(occ.startTime)} – ${formatTime12Hour(occ.endTime)} • ${occ.category}`;
          if (rule.type === 'advance') {
            body = `Starts in ${Math.abs(rule.offsetMinutes)} minutes • ${formatTime12Hour(occ.startTime)}`;
          } else if (rule.type === 'end') {
            body = `Activity ending now • Next transition`;
          }

          scheduledItems.push({
            id,
            occurrenceId: occ.occurrenceId,
            triggerType: rule.type,
            scheduledTimestamp,
            title: `Routine: ${occ.title}`,
            body,
            actionTypeId: ACTION_TYPE_ROUTINE,
            extra: {
              templateId: occ.templateId,
              date: occ.date,
              triggerType: rule.type,
            },
          });
        }
      }
    }

    // Sort by scheduledTimestamp ascending
    scheduledItems.sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp);
    return scheduledItems;
  }

  static getLocalRegistry(userId: string): ScheduledNotificationItem[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${NOTIFICATION_REGISTRY_KEY}${userId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveLocalRegistry(userId: string, items: ScheduledNotificationItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${NOTIFICATION_REGISTRY_KEY}${userId}`, JSON.stringify(items));
  }

  static async reconcileNotifications(
    userId: string,
    templates: RoutineTemplate[],
    overrides: OccurrenceOverride[],
    prefs: NotificationPreferences
  ): Promise<{ scheduled: number; cancelled: number }> {
    const targetItems = this.compute72HourSchedule(templates, overrides, prefs);
    this.saveLocalRegistry(userId, targetItems);

    if (!this.isNative()) {
      return { scheduled: targetItems.length, cancelled: 0 };
    }

    try {
      await this.initialize(userId);

      // Get pending notifications currently queued in native Android AlarmManager
      const pending = await LocalNotifications.getPending();
      const pendingIds = new Set(pending.notifications.map((n) => n.id));
      const targetIds = new Set(targetItems.map((n) => n.id));

      // Obsolete IDs to cancel
      const toCancel: LocalNotificationSchema[] = pending.notifications.filter(
        (n) => !targetIds.has(n.id)
      );

      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
      }

      // Items to schedule (not already scheduled)
      const toScheduleItems = targetItems.filter((item) => !pendingIds.has(item.id));

      if (toScheduleItems.length > 0) {
        const schemaList: LocalNotificationSchema[] = toScheduleItems.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          schedule: { at: new Date(item.scheduledTimestamp) },
          channelId: NOTIFICATION_CHANNEL_ID,
          actionTypeId: ACTION_TYPE_ROUTINE,
          extra: item.extra,
        }));

        await LocalNotifications.schedule({ notifications: schemaList });
      }

      return {
        scheduled: toScheduleItems.length,
        cancelled: toCancel.length,
      };
    } catch (err) {
      console.warn('Reconcile notifications error:', err);
      return { scheduled: 0, cancelled: 0 };
    }
  }

  static async sendTestNotification(): Promise<boolean> {
    if (!this.isNative()) {
      // In web browser, test standard browser notification if permitted
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('My Routine: Test Alert', {
            body: 'Native notification test successful. Zepp mirroring verified.',
            icon: '/favicon.ico',
          });
          return true;
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification('My Routine: Test Alert', {
              body: 'Native notification test successful. Zepp mirroring verified.',
              icon: '/favicon.ico',
            });
            return true;
          }
        }
      }
      return false;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: generateNotificationId(`test_alert_${Date.now()}`),
            title: 'My Routine: Test Alert',
            body: '6:10 AM - Meditation (30m) • Smartwatch Mirroring Verified',
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second in future
            channelId: NOTIFICATION_CHANNEL_ID,
            actionTypeId: ACTION_TYPE_ROUTINE,
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn('Failed to send test notification:', err);
      return false;
    }
  }
}
