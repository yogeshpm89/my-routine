import { Capacitor, registerPlugin } from '@capacitor/core';
import { ActivityOccurrence } from '@/types/routine';
import {
  timeToMinutes,
  formatTime12Hour,
  getCurrentTimeString,
} from '@/lib/time-utils';

export interface RoutineWidgetData {
  routineTitle: string;
  currentActivityTitle: string;
  currentActivityTime: string;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  statusText?: string;
  isAllCompleted?: boolean;
  isSkipped?: boolean;
}

export interface RoutineWidgetPluginInterface {
  updateWidgetData(options: RoutineWidgetData): Promise<{ success: boolean }>;
  getWidgetData(): Promise<RoutineWidgetData & { lastUpdated: number }>;
}

export class RoutineWidgetWeb implements RoutineWidgetPluginInterface {
  async updateWidgetData(options: RoutineWidgetData): Promise<{ success: boolean }> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routine_widget_data_web_fallback', JSON.stringify(options));
      } catch {
        // ignore web storage errors
      }
    }
    return { success: true };
  }

  async getWidgetData(): Promise<RoutineWidgetData & { lastUpdated: number }> {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('routine_widget_data_web_fallback');
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    return {
      routineTitle: 'My Routine',
      currentActivityTitle: 'No active activity',
      currentActivityTime: '',
      completedCount: 0,
      totalCount: 0,
      progressPercent: 0,
      statusText: '',
      isAllCompleted: false,
      isSkipped: false,
      lastUpdated: Date.now(),
    };
  }
}

export const routineWidgetWeb = new RoutineWidgetWeb();

export const RoutineWidget: RoutineWidgetPluginInterface =
  typeof window !== 'undefined' && Capacitor.isNativePlatform()
    ? registerPlugin<RoutineWidgetPluginInterface>('RoutineWidget', {
        web: () => routineWidgetWeb,
      })
    : routineWidgetWeb;

/**
 * Calculates current routine metrics and pushes an immediate update
 * to the native Android home screen widget.
 */
export async function syncOccurrencesToWidget(
  occurrences: ActivityOccurrence[],
  routineName: string = 'Today\'s Routine'
): Promise<void> {
  try {
    const totalCount = occurrences.length;
    const completedCount = occurrences.filter((o) => o.log?.status === 'completed').length;
    const isAllSkipped = totalCount > 0 && occurrences.every((o) => o.log?.status === 'skipped');
    const isAllCompleted = totalCount > 0 && completedCount === totalCount;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const currentTime = getCurrentTimeString('Asia/Kolkata');
    const currentMinutes = timeToMinutes(currentTime);

    // 1. Current active occurrence based on time window
    const currentOccurrence = occurrences.find((o) => {
      const startM = timeToMinutes(o.startTime);
      const endM = timeToMinutes(o.endTime);
      if (endM >= startM) {
        return currentMinutes >= startM && currentMinutes < endM;
      }
      return currentMinutes >= startM || currentMinutes < endM;
    });

    // 2. Next upcoming occurrence if no active one
    const nextOccurrence = occurrences.find((o) => {
      const startM = timeToMinutes(o.startTime);
      return startM > currentMinutes && o.log?.status !== 'completed' && o.log?.status !== 'skipped';
    });

    // 3. Fallback to first incomplete occurrence
    const firstPending = occurrences.find(
      (o) => o.log?.status !== 'completed' && o.log?.status !== 'skipped'
    );

    const activeOccurrence = currentOccurrence || nextOccurrence || firstPending;

    let currentActivityTitle = 'No routine activities';
    let currentActivityTime = '';
    let statusText = '';

    if (isAllCompleted) {
      currentActivityTitle = 'All routines completed!';
      currentActivityTime = 'Great job today!';
      statusText = '100% Done';
    } else if (isAllSkipped) {
      currentActivityTitle = 'Routine skipped for today';
      currentActivityTime = 'Holiday / Weekend rest';
      statusText = 'Skipped';
    } else if (activeOccurrence) {
      currentActivityTitle = activeOccurrence.title;
      currentActivityTime = `${formatTime12Hour(activeOccurrence.startTime)} - ${formatTime12Hour(activeOccurrence.endTime)}`;
      const st = activeOccurrence.log?.status;
      if (st === 'in_progress') statusText = 'In Progress';
      else if (st === 'completed') statusText = 'Done';
      else if (st === 'skipped') statusText = 'Skipped';
      else if (currentOccurrence) statusText = 'Active Now';
      else statusText = 'Upcoming';
    }

    const payload: RoutineWidgetData = {
      routineTitle: routineName,
      currentActivityTitle,
      currentActivityTime,
      completedCount,
      totalCount,
      progressPercent,
      statusText,
      isAllCompleted,
      isSkipped: isAllSkipped,
    };

    await RoutineWidget.updateWidgetData(payload);
  } catch (err) {
    console.warn('Failed to sync routine status to Android widget:', err);
  }
}
