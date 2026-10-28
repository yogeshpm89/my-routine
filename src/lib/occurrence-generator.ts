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
  logs.forEach((l) => {
    if (!l.date || l.date === targetDate) {
      logMap.set(l.templateId, l);
    }
  });

  const overrideMap = new Map<string, OccurrenceOverride>();
  overrides.forEach((o) => {
    if (!o.date || o.date === targetDate) {
      overrideMap.set(o.templateId, o);
    }
  });

  for (const template of templates) {
    const override = overrideMap.get(template.id);
    if (override && override.isCancelled) {
      continue;
    }

    const log = logMap.get(template.id);

    // If template is archived:
    // Only generate an occurrence if an actual historical log exists for this date.
    // Never generate unlogged future/pending occurrences for archived routines.
    if (template.isArchived) {
      if (!log) {
        continue;
      }
    } else {
      // Active template: must match recurrence rule unless a log already exists for this date
      if (!matchesRecurrence(template, targetDate) && !log) {
        continue;
      }
    }

    const isReplaced = Boolean(override?.isReplaced);
    const replacement = override?.replacementActivity;
    const replacementReason = replacement?.reason;

    const startTime = override?.modifiedStartTime ?? template.startTime;
    const endTime = override?.modifiedEndTime ?? template.endTime;
    const title = override?.modifiedTitle ?? template.title;
    const notes = override?.notes ?? template.notes;
    const media = override?.modifiedMedia ?? template.media ?? [];
    const durationMinutes = calculateDuration(startTime, endTime);

    const steps = override?.modifiedSteps ?? template.steps ?? [];
    const completedStepIds = log?.completedStepIds ?? [];
    const comments = log?.comments ?? [];

    // Synthesize log for replaced original block if no explicit log exists
    let effectiveLog = log;
    if (isReplaced) {
      if (!effectiveLog) {
        effectiveLog = {
          id: `${targetDate}_${template.id}`,
          userId: template.userId,
          templateId: template.id,
          date: targetDate,
          status: (override?.partialDurationMinutes && override.partialDurationMinutes > 0) ? 'partial' : 'replaced',
          actualDurationMinutes: override?.partialDurationMinutes ?? 0,
          targetDurationMinutes: durationMinutes,
          completionNotes: replacementReason ? `Replaced: ${replacementReason}` : 'Replaced by another activity',
          completedStepIds: [],
          comments: [],
          updatedAt: override?.updatedAt ?? Date.now(),
        };
      } else if (effectiveLog.status === 'pending') {
        effectiveLog = {
          ...effectiveLog,
          status: (override?.partialDurationMinutes && override.partialDurationMinutes > 0) ? 'partial' : 'replaced',
          actualDurationMinutes: override?.partialDurationMinutes ?? effectiveLog.actualDurationMinutes ?? 0,
        };
      }
    }

    occurrences.push({
      occurrenceId: `${template.id}_${targetDate}`,
      templateId: template.id,
      date: targetDate,
      title: isReplaced ? (override?.originalActivitySnapshot?.title ?? template.title) : title,
      category: isReplaced ? (override?.originalActivitySnapshot?.category ?? template.category) : template.category,
      startTime,
      endTime,
      durationMinutes,
      isFixed: template.isFixed,
      notes,
      color: template.color,
      notifications: template.notifications,
      media,
      steps,
      completedStepIds,
      comments,
      aiActionId: template.aiActionId,
      hasOverride: Boolean(override),
      isCancelled: false,
      isPostponed: Boolean(override?.isPostponed),
      isReplaced,
      replacement,
      replacementReason,
      log: effectiveLog,
      template,
    });

    // If this occurrence has an active replacement activity, synthesize the replacement occurrence
    if (isReplaced && replacement) {
      const replDuration = replacement.durationMinutes || calculateDuration(replacement.startTime, replacement.endTime);
      const replTemplateId = replacement.id || `repl_tmpl_${template.id}`;
      const replOccurrenceId = `replace_${template.id}_${targetDate}`;
      const replLog = logMap.get(replTemplateId) || logMap.get(replOccurrenceId);

      const replacementTemplate: RoutineTemplate = {
        id: replTemplateId,
        userId: template.userId,
        title: replacement.title,
        category: replacement.category || 'other',
        startTime: replacement.startTime,
        endTime: replacement.endTime,
        isFixed: false,
        recurrence: {
          frequency: 'once',
          startDate: targetDate,
          daysOfWeek: [],
          exceptions: [],
        },
        notifications: template.notifications || [],
        steps: [],
        notes: replacement.reason ? `Replacement for "${template.title}". Reason: ${replacement.reason}` : `Replacement for "${template.title}"`,
        color: replacement.color || '#06b6d4',
        timezone: template.timezone || 'Asia/Kolkata',
        isArchived: false,
        createdAt: override?.updatedAt ?? Date.now(),
        updatedAt: override?.updatedAt ?? Date.now(),
      };

      occurrences.push({
        occurrenceId: replOccurrenceId,
        templateId: replTemplateId,
        date: targetDate,
        title: replacement.title,
        category: replacement.category || 'other',
        startTime: replacement.startTime,
        endTime: replacement.endTime,
        durationMinutes: replDuration,
        isFixed: false,
        notes: replacement.reason ? `Replacement for "${template.title}". Reason: ${replacement.reason}` : `Replacement for "${template.title}"`,
        color: replacement.color || '#06b6d4',
        notifications: template.notifications || [],
        media: [],
        steps: [],
        completedStepIds: replLog?.completedStepIds ?? [],
        comments: replLog?.comments ?? [],
        hasOverride: true,
        isCancelled: false,
        isPostponed: false,
        isReplacement: true,
        replacesTemplateId: template.id,
        replacesTitle: template.title,
        replacementReason: replacement.reason,
        linkedGoalId: replacement.linkedGoalId,
        log: replLog,
        template: replacementTemplate,
      });
    }

    // If the original activity was rescheduled to another time slot today, synthesize the rescheduled occurrence
    if (isReplaced && override?.rescheduledTo && override.rescheduledTo.date === targetDate) {
      const resched = override.rescheduledTo;
      const reschedDuration = calculateDuration(resched.startTime, resched.endTime);
      const reschedOccurrenceId = `resched_${template.id}_${targetDate}`;
      const reschedTemplateId = `resched_tmpl_${template.id}`;
      const reschedLog = logMap.get(reschedTemplateId) || logMap.get(reschedOccurrenceId);

      const reschedTemplate: RoutineTemplate = {
        ...template,
        id: reschedTemplateId,
        startTime: resched.startTime,
        endTime: resched.endTime,
      };

      occurrences.push({
        occurrenceId: reschedOccurrenceId,
        templateId: reschedTemplateId,
        date: targetDate,
        title: `${template.title} (Rescheduled)`,
        category: template.category,
        startTime: resched.startTime,
        endTime: resched.endTime,
        durationMinutes: reschedDuration,
        isFixed: template.isFixed,
        notes: `Rescheduled from ${template.startTime}–${template.endTime}`,
        color: template.color,
        notifications: template.notifications,
        media: template.media,
        steps: template.steps,
        completedStepIds: reschedLog?.completedStepIds ?? [],
        comments: reschedLog?.comments ?? [],
        hasOverride: true,
        isCancelled: false,
        isPostponed: false,
        isRescheduled: true,
        rescheduledFrom: {
          originalStartTime: template.startTime,
          originalEndTime: template.endTime,
        },
        log: reschedLog,
        template: reschedTemplate,
      });
    }
  }

  // Ensure that any log on targetDate whose template was not in the passed templates
  // is still recovered and rendered in historical calendar/analytics
  const processedTemplateIds = new Set(occurrences.map((o) => o.templateId));
  for (const [templateId, log] of logMap.entries()) {
    if (!processedTemplateIds.has(templateId)) {
      const override = overrideMap.get(templateId);
      if (override && override.isCancelled) continue;

      const startTime = override?.modifiedStartTime ?? log.actualStartTime ?? '09:00';
      const endTime = override?.modifiedEndTime ?? log.actualEndTime ?? '10:00';
      const durationMinutes =
        log.actualDurationMinutes > 0
          ? log.actualDurationMinutes
          : calculateDuration(startTime, endTime);

      const fallbackTemplate: RoutineTemplate = {
        id: templateId,
        userId: log.userId,
        title: override?.modifiedTitle ?? 'Archived Activity',
        category: 'other',
        startTime,
        endTime,
        isFixed: false,
        recurrence: {
          frequency: 'once',
          startDate: targetDate,
          daysOfWeek: [],
          exceptions: [],
        },
        notifications: [],
        steps: [],
        notes: log.completionNotes || '',
        color: '#64748b',
        timezone: 'Asia/Kolkata',
        isArchived: true,
        createdAt: log.updatedAt,
        updatedAt: log.updatedAt,
      };

      occurrences.push({
        occurrenceId: `${templateId}_${targetDate}`,
        templateId,
        date: targetDate,
        title: fallbackTemplate.title,
        category: fallbackTemplate.category,
        startTime,
        endTime,
        durationMinutes,
        isFixed: false,
        notes: log.completionNotes || '',
        color: fallbackTemplate.color,
        notifications: [],
        media: [],
        steps: override?.modifiedSteps ?? [],
        completedStepIds: log.completedStepIds ?? [],
        comments: log.comments ?? [],
        hasOverride: Boolean(override),
        isCancelled: false,
        isPostponed: Boolean(override?.isPostponed),
        log,
        template: fallbackTemplate,
      });
    }
  }

  // Sort chronologically by startTime
  occurrences.sort((a, b) => {
    const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
  });

  return occurrences;
}
