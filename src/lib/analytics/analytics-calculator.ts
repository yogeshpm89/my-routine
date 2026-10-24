import { ActivityOccurrence, ActivityLog, GoalTarget, ActivityCategory } from '@/types/routine';
import { GoalProgressEntry } from '@/types/goal-progress';
import { formatDuration } from '@/lib/time-utils';

export interface CategoryAnalytics {
  category: ActivityCategory;
  plannedMinutes: number;
  actualMinutes: number;
  count: number;
  percentageOfPlanned: number;
}

export interface GoalFulfillment {
  goal: GoalTarget;
  targetMinutes: number;
  plannedMinutes: number;
  actualMinutes: number;
  manualMinutes?: number;
  fulfillmentPercentage: number;
  status: 'achieved' | 'on_track' | 'under_target' | 'unscheduled';
  deficitMinutes: number;
}

export interface RoutineAnalyticsSummary {
  timeframe: 'day' | 'week';
  startDate: string;
  endDate: string;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  completionRate: number; // 0 - 100%
  adherenceRate: number; // actual vs planned ratio capped at 100%
  statusCounts: {
    completed: number;
    partial: number;
    in_progress: number;
    skipped: number;
    pending: number;
  };
  categoryBreakdown: CategoryAnalytics[];
  goalFulfillments: GoalFulfillment[];
  insights: string[];
}

export class AnalyticsCalculator {
  static computeSummary(
    occurrences: ActivityOccurrence[],
    goals: GoalTarget[],
    timeframe: 'day' | 'week',
    startDate: string,
    endDate: string,
    progressEntries: GoalProgressEntry[] = []
  ): RoutineAnalyticsSummary {
    let totalPlannedMinutes = 0;
    let totalActualMinutes = 0;

    const statusCounts = {
      completed: 0,
      partial: 0,
      in_progress: 0,
      skipped: 0,
      pending: 0,
    };

    const categoryMap = new Map<ActivityCategory, { planned: number; actual: number; count: number }>();

    for (const occ of occurrences) {
      if (occ.isCancelled) continue;

      totalPlannedMinutes += occ.durationMinutes;

      const log = occ.log;
      const status = log?.status || 'pending';

      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts.pending++;
      }

      // Compute actual minutes: if log has actualDurationMinutes use it, else if completed use planned duration
      let actual = 0;
      if (log?.actualDurationMinutes && log.actualDurationMinutes > 0) {
        actual = log.actualDurationMinutes;
      } else if (status === 'completed') {
        actual = occ.durationMinutes;
      } else if (status === 'partial') {
        actual = Math.round(occ.durationMinutes * 0.5);
      }

      totalActualMinutes += actual;

      // Category breakdown
      const existing = categoryMap.get(occ.category) || { planned: 0, actual: 0, count: 0 };
      categoryMap.set(occ.category, {
        planned: existing.planned + occ.durationMinutes,
        actual: existing.actual + actual,
        count: existing.count + 1,
      });
    }

    // Incorporate manual goal progress entries
    const inRangeEntries = progressEntries.filter(
      (e) => e.date >= startDate && e.date <= endDate
    );
    const totalManualMinutes = inRangeEntries.reduce(
      (sum, e) => sum + (e.durationMinutes ?? e.minutes ?? 0),
      0
    );
    totalActualMinutes += totalManualMinutes;

    for (const entry of inRangeEntries) {
      const targetGoal = goals.find((g) => g.id === entry.goalId);
      if (targetGoal && targetGoal.categories.length > 0) {
        const cat = targetGoal.categories[0] as ActivityCategory;
        const entryMins = entry.durationMinutes ?? entry.minutes ?? 0;
        const existing = categoryMap.get(cat) || { planned: 0, actual: 0, count: 0 };
        categoryMap.set(cat, {
          planned: existing.planned,
          actual: existing.actual + entryMins,
          count: existing.count + 1,
        });
      }
    }

    const totalOccurrences = occurrences.filter((o) => !o.isCancelled).length;
    const completionRate =
      totalOccurrences > 0
        ? Math.round((statusCounts.completed / totalOccurrences) * 100)
        : 0;

    const adherenceRate =
      totalPlannedMinutes > 0
        ? Math.min(100, Math.round((totalActualMinutes / totalPlannedMinutes) * 100))
        : 0;

    // Build Category Analytics
    const categoryBreakdown: CategoryAnalytics[] = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        plannedMinutes: data.planned,
        actualMinutes: data.actual,
        count: data.count,
        percentageOfPlanned:
          totalPlannedMinutes > 0 ? Math.round((data.planned / totalPlannedMinutes) * 100) : 0,
      })
    );

    // Sort categories by planned duration descending
    categoryBreakdown.sort((a, b) => b.plannedMinutes - a.plannedMinutes);

    // Goal Target Fulfillment
    const daysMultiplier = timeframe === 'week' ? 5 : 1; // 5 active weekdays for work, or based on activeDays
    const goalFulfillments: GoalFulfillment[] = [];

    // Identify explicitly claimed templates
    const claimedTemplates = new Set<string>();
    goals.forEach((g) => g.templateIds.forEach((id) => claimedTemplates.add(id)));

    for (const goal of goals) {
      if (goal.isArchived) continue;

      let planned = 0;
      let routineActual = 0;

      for (const occ of occurrences) {
        if (occ.isCancelled) continue;

        let matches = false;
        if (goal.templateIds.length > 0) {
          matches = goal.templateIds.includes(occ.templateId);
        } else {
          matches =
            occ.title.toLowerCase().includes(goal.title.toLowerCase()) ||
            (goal.categories.includes(occ.category) && !claimedTemplates.has(occ.templateId));
        }

        if (matches) {
          planned += occ.durationMinutes;
          const occLog = occ.log;
          if (occLog?.actualDurationMinutes && occLog.actualDurationMinutes > 0) {
            routineActual += occLog.actualDurationMinutes;
          } else if (occLog?.status === 'completed') {
            routineActual += occ.durationMinutes;
          } else if (occLog?.status === 'partial') {
            routineActual += Math.round(occ.durationMinutes * 0.5);
          }
        }
      }

      // Add manual progress entries for this goal
      const goalEntries = inRangeEntries.filter((e) => e.goalId === goal.id);
      const manualMinutes = goalEntries.reduce(
        (sum, e) => sum + (e.durationMinutes ?? e.minutes ?? 0),
        0
      );
      const actual = routineActual + manualMinutes;

      const activeDaysCount = timeframe === 'week' ? goal.activeDays.length : 1;
      const targetMins = goal.targetMinutes * activeDaysCount;

      const fulfillmentPercentage =
        targetMins > 0 ? Math.min(150, Math.round((actual / targetMins) * 1000) / 10) : 0;

      let status: 'achieved' | 'on_track' | 'under_target' | 'unscheduled' = 'under_target';
      if (planned === 0 && actual === 0) {
        status = 'unscheduled';
      } else if (actual >= targetMins) {
        status = 'achieved';
      } else if (planned >= targetMins && actual > 0) {
        status = 'on_track';
      }

      const deficit = Math.max(0, targetMins - actual);

      goalFulfillments.push({
        goal,
        targetMinutes: targetMins,
        plannedMinutes: planned,
        actualMinutes: actual,
        manualMinutes,
        fulfillmentPercentage,
        status,
        deficitMinutes: deficit,
      });
    }

    // Sort goals: achieved first, then on_track, then under_target, then unscheduled
    goalFulfillments.sort((a, b) => b.fulfillmentPercentage - a.fulfillmentPercentage);

    // Smart Insights Generation
    const insights: string[] = [];

    if (completionRate >= 80) {
      insights.push(`High Consistency: You completed ${completionRate}% of your scheduled routine activities!`);
    } else if (completionRate > 0) {
      insights.push(`Routine Progress: ${statusCounts.completed} of ${totalOccurrences} scheduled blocks executed.`);
    } else {
      insights.push('Routine Scheduled: Begin logging activities to track actual execution vs planned time.');
    }

    // Work target insight
    const workGoal = goalFulfillments.find((g) => g.goal.id === 'goal_melodyarc_araynatech');
    if (workGoal) {
      insights.push(
        `Main-Job Allocation: ${formatDuration(workGoal.plannedMinutes)} planned (${formatDuration(workGoal.actualMinutes)} logged) against ${formatDuration(workGoal.targetMinutes)} daily target.`
      );
    }

    // Deficit highlights
    const topDeficit = goalFulfillments.find((g) => g.deficitMinutes > 0 && g.status !== 'achieved');
    if (topDeficit) {
      insights.push(
        `Goal Focus Area: "${topDeficit.goal.title}" has a deficit of ${formatDuration(topDeficit.deficitMinutes)}.`
      );
    }

    return {
      timeframe,
      startDate,
      endDate,
      totalPlannedMinutes,
      totalActualMinutes,
      completionRate,
      adherenceRate,
      statusCounts,
      categoryBreakdown,
      goalFulfillments,
      insights,
    };
  }
}
