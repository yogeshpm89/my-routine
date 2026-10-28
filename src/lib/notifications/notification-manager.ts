import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
} from '@/types/routine';
import {
  NotificationPreferences,
  ScheduledNotificationItem,
  NotificationDiagnostics,
} from '@/types/notifications';
import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { DayTemplateResolver } from '@/lib/templates/day-template-resolver';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { LogRepository } from '@/lib/repositories/log-repository';
import {
  addDays,
  timeToMinutes,
  formatTime12Hour,
  getTodayDateString,
  getCurrentTimeString,
} from '@/lib/time-utils';

export const NOTIFICATION_CHANNEL_ID = 'routine_reminders';
export const ACTION_TYPE_ROUTINE = 'ROUTINE_ACTIONS';

const NOTIFICATION_REGISTRY_KEY = 'my_routine_notif_registry_';
const NOTIFICATION_DIAGNOSTICS_KEY = 'my_routine_notif_diagnostics_';

// Deterministic 32-bit positive integer hash for notification IDs in range [1, 2147483646]
export function generateNotificationId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash) % 2147483647;
  return positive === 0 ? 1 : positive;
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

      // 3. Listen to Notification Action Events (Done, Snooze, Skip)
      LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
        const extra = notificationAction.notification.extra;
        const actionId = notificationAction.actionId;

        if (!extra || !extra.templateId || !extra.date) return;

        const { templateId, date } = extra;

        if (actionId === 'COMPLETE' || actionId === 'SKIP') {
          const status = actionId === 'COMPLETE' ? 'completed' : 'skipped';
          await LogRepository.updateStatus(userId, date, templateId, status);

          // Cancel remaining alarms for this completed/skipped occurrence
          try {
            const pending = await LocalNotifications.getPending();
            const toCancel = pending.notifications.filter(
              (n) => n.extra?.templateId === templateId && n.extra?.date === date
            );
            if (toCancel.length > 0) {
              await LocalNotifications.cancel({ notifications: toCancel });
            }
          } catch (err) {
            console.warn('Failed to clear pending notifications after action:', err);
          }
        } else if (actionId === 'SNOOZE') {
          // Schedule a snooze reminder 10 minutes from now (deterministic ID prevents duplicate snooze entries)
          const snoozeMinutes = 10;
          const snoozeTimestamp = Date.now() + snoozeMinutes * 60 * 1000;
          const snoozeId = generateNotificationId(`${templateId}_${date}_snooze`);

          await LocalNotifications.schedule({
            notifications: [
              {
                id: snoozeId,
                title: `Snoozed: ${notificationAction.notification.title.replace(/^Snoozed:\s*/, '')}`,
                body: `Snoozed reminder ready for completion.`,
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
    baseDate: string = getTodayDateString('Asia/Kolkata'),
    logs: ActivityLog[] = [],
    dayTemplates?: DayRoutineTemplate[],
    weeklyPlanner?: WeeklyPlannerConfig
  ): ScheduledNotificationItem[] {
    const scheduledItems: ScheduledNotificationItem[] = [];
    const nowTimestamp = Date.now();
    // 72-hour window boundary (3 days)
    const maxWindowTimestamp = nowTimestamp + 72 * 60 * 60 * 1000;

    // Filter out archived templates upfront - archived routines must never schedule future reminders
    const activeTemplates = templates.filter((t) => !t.isArchived);

    // Rolling 3 days (Today, Tomorrow, Day after)
    const dates = [baseDate, addDays(baseDate, 1), addDays(baseDate, 2)];

    for (const dateStr of dates) {
      const dayBlocks =
        dayTemplates && weeklyPlanner && dayTemplates.length > 0
          ? DayTemplateResolver.resolveBlocksForDate(dateStr, weeklyPlanner, dayTemplates)
          : activeTemplates;
      const activeDayBlocks = dayBlocks.filter((t) => !t.isArchived);
      const occurrences = generateDailyOccurrences(activeDayBlocks, overrides, logs, dateStr);

      for (const occ of occurrences) {
        // Skip cancelled occurrences
        if (occ.isCancelled) continue;

        // Skip occurrences that are already completed, skipped, or replaced
        if (
          occ.log?.status === 'completed' ||
          occ.log?.status === 'skipped' ||
          occ.log?.status === 'replaced' ||
          occ.isReplaced
        ) {
          continue;
        }

        const notifRules = occ.notifications || [];

        for (const rule of notifRules) {
          if (!rule.enabled) continue;

          let targetTime = occ.startTime;
          if (rule.type === 'end') {
            targetTime = occ.endTime;
          }

          const [h, m] = targetTime.split(':').map(Number);
          const [yr, mo, dy] = dateStr.split('-').map(Number);

          const offsetMinutes = rule.offsetMinutes || 0;
          const targetTotalMinutes = h * 60 + m + offsetMinutes;

          const scheduledDate = new Date(yr, mo - 1, dy, 0, targetTotalMinutes, 0, 0);
          const scheduledTimestamp = scheduledDate.getTime();

          // If in the past, skip (past reminders are never recreated)
          if (scheduledTimestamp <= nowTimestamp) continue;

          // If beyond the 72-hour rolling window, skip
          if (scheduledTimestamp > maxWindowTimestamp) continue;

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

    // Sort chronologically ascending
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

  static getDiagnostics(userId: string): NotificationDiagnostics {
    const fallback: NotificationDiagnostics = {
      permissionGranted: false,
      scheduledCount: 0,
      lastReconciliationTime: null,
      nextScheduledTime: null,
      nextScheduledTitle: null,
      windowEndDate: addDays(getTodayDateString('Asia/Kolkata'), 2),
      isNative: this.isNative(),
      quietHoursActiveNow: false,
    };

    if (typeof window === 'undefined') return fallback;

    const raw = localStorage.getItem(`${NOTIFICATION_DIAGNOSTICS_KEY}${userId}`);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as NotificationDiagnostics;
    } catch {
      return fallback;
    }
  }

  static saveDiagnostics(userId: string, diagnostics: NotificationDiagnostics): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${NOTIFICATION_DIAGNOSTICS_KEY}${userId}`, JSON.stringify(diagnostics));
  }

  static async reconcileNotifications(
    userId: string,
    templates: RoutineTemplate[],
    overrides: OccurrenceOverride[],
    prefs: NotificationPreferences,
    logs: ActivityLog[] = [],
    dayTemplates?: DayRoutineTemplate[],
    weeklyPlanner?: WeeklyPlannerConfig
  ): Promise<{ scheduled: number; cancelled: number }> {
    const baseDate = getTodayDateString('Asia/Kolkata');
    const targetItems = this.compute72HourSchedule(
      templates,
      overrides,
      prefs,
      baseDate,
      logs,
      dayTemplates,
      weeklyPlanner
    );
    this.saveLocalRegistry(userId, targetItems);

    const now = getCurrentTimeString('Asia/Kolkata');
    const quietActive = prefs.quietHoursEnabled && isQuietHour(now, prefs.quietHoursStart, prefs.quietHoursEnd);

    if (!this.isNative()) {
      // In web/desktop, update diagnostic state and return
      this.saveDiagnostics(userId, {
        permissionGranted: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
        scheduledCount: targetItems.length,
        lastReconciliationTime: Date.now(),
        nextScheduledTime: targetItems[0]?.scheduledTimestamp ?? null,
        nextScheduledTitle: targetItems[0]?.title ?? null,
        windowEndDate: addDays(baseDate, 2),
        isNative: false,
        quietHoursActiveNow: quietActive,
      });
      return { scheduled: targetItems.length, cancelled: 0 };
    }

    try {
      await this.initialize(userId);

      // Query pending alarms currently registered in native Android AlarmManager
      const pending = await LocalNotifications.getPending();
      const pendingMap = new Map<number, LocalNotificationSchema>();
      pending.notifications.forEach((n) => pendingMap.set(n.id, n));

      const toCancel: LocalNotificationSchema[] = [];
      const toScheduleItems: ScheduledNotificationItem[] = [];

      for (const item of targetItems) {
        const existing = pendingMap.get(item.id);
        if (!existing) {
          toScheduleItems.push(item);
        } else {
          // If scheduled timestamp has shifted (e.g. routine time edit), replace it
          const existingTime = existing.schedule?.at ? new Date(existing.schedule.at).getTime() : 0;
          if (Math.abs(existingTime - item.scheduledTimestamp) > 1000) {
            toCancel.push(existing);
            toScheduleItems.push(item);
          }
        }
      }

      // Cancel obsolete alarms no longer present in target schedule
      const targetIds = new Set(targetItems.map((n) => n.id));
      for (const p of pending.notifications) {
        if (!targetIds.has(p.id)) {
          toCancel.push(p);
        }
      }

      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
      }

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

      // Read back final pending count for diagnostics
      const activePending = await LocalNotifications.getPending();
      const hasPermission = await this.checkPermissions();

      this.saveDiagnostics(userId, {
        permissionGranted: hasPermission,
        scheduledCount: activePending.notifications.length,
        lastReconciliationTime: Date.now(),
        nextScheduledTime: targetItems[0]?.scheduledTimestamp ?? null,
        nextScheduledTitle: targetItems[0]?.title ?? null,
        windowEndDate: addDays(baseDate, 2),
        isNative: true,
        quietHoursActiveNow: quietActive,
      });

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
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('My Routine: Test Alert', {
            body: 'Native notification test successful. Smartwatch mirroring verified.',
            icon: '/favicon.ico',
          });
          return true;
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification('My Routine: Test Alert', {
              body: 'Native notification test successful. Smartwatch mirroring verified.',
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
