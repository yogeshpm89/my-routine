import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
  ActivityOccurrence,
} from '@/types/routine';
import {
  calculateDuration,
  getDayOfWeek,
  timeToMinutes,
} from '@/lib/time-utils';

export function matchesRecurrence(
  template: RoutineTemplate,
  targetDate: string
): boolean {
  if (template.isArchived) return false;

  const { recurrence } = template;
  if (targetDate < recurrence.startDate) return false;
  if (recurrence.endDate && targetDate > recurrence.endDate) return false;
  if (recurrence.exceptions && recurrence.exceptions.includes(targetDate)) return false;

  const dayOfWeek = getDayOfWeek(targetDate);

  switch (recurrence.frequency) {
    case 'once':
      return recurrence.startDate === targetDate;
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly':
    case 'custom':
      return recurrence.daysOfWeek.includes(dayOfWeek);
    default:
      return false;
  }
}

export function generateDailyOccurrences(
  templates: RoutineTemplate[],
  overrides: OccurrenceOverride[],
  logs: ActivityLog[],
  targetDate: string
): ActivityOccurrence[] {
  const occurrences: ActivityOccurrence[] = [];
  const logMap = new Map<string, ActivityLog>();
  logs.forEach((l) => logMap.set(l.templateId, l));

  const overrideMap = new Map<string, OccurrenceOverride>();
  overrides.forEach((o) => overrideMap.set(o.templateId, o));

  for (const template of templates) {
    if (!matchesRecurrence(template, targetDate)) continue;

    const override = overrideMap.get(template.id);
    if (override && override.isCancelled) {
      continue;
    }

    const startTime = override?.modifiedStartTime ?? template.startTime;
    const endTime = override?.modifiedEndTime ?? template.endTime;
    const title = override?.modifiedTitle ?? template.title;
    const notes = override?.notes ?? template.notes;
    const durationMinutes = calculateDuration(startTime, endTime);
    const log = logMap.get(template.id);

    occurrences.push({
      occurrenceId: `${template.id}_${targetDate}`,
      templateId: template.id,
      date: targetDate,
      title,
      category: template.category,
      startTime,
      endTime,
      durationMinutes,
      isFixed: template.isFixed,
      notes,
      color: template.color,
      notifications: template.notifications,
      hasOverride: Boolean(override),
      isCancelled: false,
      isPostponed: Boolean(override?.isPostponed),
      log,
      template,
    });
  }

  // Sort chronologically by startTime
  occurrences.sort((a, b) => {
    const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
  });

  return occurrences;
}
