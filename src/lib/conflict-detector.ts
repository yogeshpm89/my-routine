import { ActivityOccurrence, GoalTarget } from '@/types/routine';
import { isTimeOverlapping, timeToMinutes, formatTime12Hour, formatDuration } from '@/lib/time-utils';

export type ConflictSeverity = 'error' | 'warning';

export interface ScheduleConflict {
  id: string;
  severity: ConflictSeverity;
  title: string;
  description: string;
  activityA?: ActivityOccurrence;
  activityB?: ActivityOccurrence;
  goal?: GoalTarget;
  deficitMinutes?: number;
  type: 'fixed_collision' | 'flexible_overlap' | 'sleep_window_encroachment' | 'goal_deficit' | 'infeasible_allocation';
}

export function detectScheduleConflicts(
  occurrences: ActivityOccurrence[],
  goals: GoalTarget[] = [],
  dayOfWeek: number = 1 // 0 = Sunday, 1 = Monday, etc.
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // 1. Check pairwise activity overlaps
  for (let i = 0; i < occurrences.length; i++) {
    for (let j = i + 1; j < occurrences.length; j++) {
      const a = occurrences[i];
      const b = occurrences[j];

      if (isTimeOverlapping(a.startTime, a.endTime, b.startTime, b.endTime)) {
        const hasFixed = a.isFixed || b.isFixed;
        if (hasFixed) {
          conflicts.push({
            id: `conflict_fixed_${a.occurrenceId}_${b.occurrenceId}`,
            severity: 'error',
            type: 'fixed_collision',
            title: `Fixed Event Collision: "${a.title}" and "${b.title}"`,
            description: `A protected fixed commitment (${a.isFixed ? a.title : b.title}) is double-booked between ${formatTime12Hour(a.startTime)} and ${formatTime12Hour(b.endTime)}. Fixed commitments cannot be silently overlapped.`,
            activityA: a,
            activityB: b,
          });
        } else {
          conflicts.push({
            id: `conflict_flex_${a.occurrenceId}_${b.occurrenceId}`,
            severity: 'warning',
            type: 'flexible_overlap',
            title: `Schedule Overlap: "${a.title}" and "${b.title}"`,
            description: `Two flexible routine blocks overlap from ${formatTime12Hour(a.startTime)} to ${formatTime12Hour(b.endTime)}. Consider adjusting start/end times.`,
            activityA: a,
            activityB: b,
          });
        }
      }
    }
  }

  // 2. Check Sleep / Bedtime window encroachments (23:30 to 06:00)
  for (const occ of occurrences) {
    if (occ.templateId === 'template_bedtime_window' || occ.templateId === 'template_wake_up') {
      continue;
    }
    const startM = timeToMinutes(occ.startTime);
    const endM = timeToMinutes(occ.endTime);

    const isDuringLateNight = startM >= 1410 || startM < 360;
    const isEndingLateNight = endM > 1410 || (endM <= 360 && endM > 0);

    if (isDuringLateNight || isEndingLateNight) {
      conflicts.push({
        id: `conflict_sleep_${occ.occurrenceId}`,
        severity: 'warning',
        type: 'sleep_window_encroachment',
        title: `Rest Window Encroachment: "${occ.title}"`,
        description: `"${occ.title}" is scheduled at ${formatTime12Hour(occ.startTime)} during your designated rest and recovery window (11:30 PM – 6:00 AM).`,
        activityA: occ,
      });
    }
  }

  // 3. Goal Target Allocation & Deficit Detection
  const activeGoals = goals.filter((g) => !g.isArchived && g.activeDays.includes(dayOfWeek));

  // Build a set of all templates explicitly claimed by specific goals
  const explicitlyClaimedTemplates = new Set<string>();
  for (const g of activeGoals) {
    for (const tId of g.templateIds) {
      explicitlyClaimedTemplates.add(tId);
    }
  }

  for (const goal of activeGoals) {
    let scheduledMinutes = 0;

    for (const occ of occurrences) {
      if (goal.templateIds.length > 0) {
        // Explicit template matching
        if (goal.templateIds.includes(occ.templateId)) {
          scheduledMinutes += occ.durationMinutes;
        }
      } else {
        // Match by title keyword or unclaimed category
        const matchesTitle = occ.title.toLowerCase().includes(goal.title.toLowerCase());
        const matchesCategory =
          goal.categories.includes(occ.category) &&
          !explicitlyClaimedTemplates.has(occ.templateId);

        if (matchesTitle || matchesCategory) {
          scheduledMinutes += occ.durationMinutes;
        }
      }
    }

    if (scheduledMinutes === 0) {
      conflicts.push({
        id: `conflict_goal_unscheduled_${goal.id}`,
        severity: 'warning',
        type: 'goal_deficit',
        title: `Unscheduled Goal: "${goal.title}"`,
        description: `Target of ${formatDuration(goal.targetMinutes)} daily is active today, but no routines are scheduled to meet it.`,
        goal,
        deficitMinutes: goal.targetMinutes,
      });
    } else if (scheduledMinutes < goal.targetMinutes) {
      const deficit = goal.targetMinutes - scheduledMinutes;
      conflicts.push({
        id: `conflict_goal_deficit_${goal.id}`,
        severity: 'warning',
        type: 'goal_deficit',
        title: `Goal Deficit: "${goal.title}"`,
        description: `Target requires ${formatDuration(goal.targetMinutes)} today, but only ${formatDuration(scheduledMinutes)} is scheduled (${deficit}m deficit).`,
        goal,
        deficitMinutes: deficit,
      });
    }
  }

  // 4. Infeasible daily schedule check
  const totalWakingScheduled = occurrences
    .filter((o) => o.templateId !== 'template_bedtime_window')
    .reduce((sum, o) => sum + o.durationMinutes, 0);

  if (totalWakingScheduled > 16 * 60) {
    conflicts.push({
      id: 'conflict_infeasible_schedule',
      severity: 'warning',
      type: 'infeasible_allocation',
      title: 'Infeasible Daily Allocation Warning',
      description: `Total scheduled waking activities total ${formatDuration(totalWakingScheduled)}, exceeding 16 hours and compressing rest/buffer windows.`,
    });
  }

  return conflicts;
}
