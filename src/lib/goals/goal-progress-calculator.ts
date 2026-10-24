import { GoalTarget, ActivityOccurrence } from '@/types/routine';
import {
  GoalProgressEntry,
  GoalTrackingUnit,
  CalculatedGoalProgress,
} from '@/types/goal-progress';

export interface GoalUnitConfig {
  primaryUnit: GoalTrackingUnit;
  unitLabel: string;
  quickPresets: number[];
  minutePresets: number[];
  conversionToMinutes: (value: number) => number;
}

export class GoalProgressCalculator {
  /**
   * Identifies the primary natural tracking unit and preset intervals for a goal.
   */
  static getGoalUnitConfig(goalId: string, goalTitle: string = ''): GoalUnitConfig {
    const id = goalId.toLowerCase();
    const title = goalTitle.toLowerCase();

    if (id.includes('cycling') || title.includes('cycling') || title.includes('bike')) {
      return {
        primaryUnit: 'km',
        unitLabel: 'km',
        quickPresets: [1, 5, 10, 15],
        minutePresets: [15, 30, 45, 60],
        conversionToMinutes: (km: number) => Math.round(km * 3.0), // 3 min per km (20 km/h average)
      };
    }

    if (id.includes('read') || title.includes('reading') || id.includes('mindvalley')) {
      return {
        primaryUnit: 'chapters',
        unitLabel: 'ch',
        quickPresets: [1, 2, 5],
        minutePresets: [5, 10, 15, 30],
        conversionToMinutes: (ch: number) => Math.round(ch * 20), // ~20 min per chapter
      };
    }

    if (id.includes('course') || title.includes('course') || id.includes('coursera') || title.includes('learn')) {
      return {
        primaryUnit: 'topics',
        unitLabel: 'topic',
        quickPresets: [1, 2],
        minutePresets: [10, 15, 30],
        conversionToMinutes: (topics: number) => Math.round(topics * 15), // ~15 min per topic
      };
    }

    // Default time-based tracking
    return {
      primaryUnit: 'minutes',
      unitLabel: 'min',
      quickPresets: [1, 5, 10, 15, 30],
      minutePresets: [1, 5, 10, 15, 30],
      conversionToMinutes: (m: number) => Math.round(m),
    };
  }

  /**
   * Deterministically calculates percentage, remaining minutes, and achievement status.
   */
  static calculateProgress(
    targetMinutes: number,
    completedMinutes: number,
    primaryUnit: GoalTrackingUnit = 'minutes',
    totalUnitValue?: number
  ): CalculatedGoalProgress {
    const safeCompleted = Math.max(0, Math.round(completedMinutes));
    const safeTarget = Math.max(0, Math.round(targetMinutes));

    if (safeTarget <= 0) {
      return {
        targetMinutes: safeTarget,
        completedMinutes: safeCompleted,
        remainingMinutes: 0,
        rawPercentage: 0,
        displayPercentage: 0,
        isAchieved: safeCompleted > 0,
        isOverTarget: false,
        overTargetMinutes: 0,
        primaryUnit,
        totalUnitValue,
      };
    }

    const rawPercentage = (safeCompleted / safeTarget) * 100;
    // 1 decimal place rounding
    const displayPercentage = Math.min(100, Math.round(rawPercentage * 10) / 10);
    const remainingMinutes = Math.max(0, safeTarget - safeCompleted);
    const isAchieved = safeCompleted >= safeTarget;
    const isOverTarget = safeCompleted > safeTarget;
    const overTargetMinutes = Math.max(0, safeCompleted - safeTarget);

    return {
      targetMinutes: safeTarget,
      completedMinutes: safeCompleted,
      remainingMinutes,
      rawPercentage,
      displayPercentage,
      isAchieved,
      isOverTarget,
      overTargetMinutes,
      primaryUnit,
      totalUnitValue,
    };
  }

  /**
   * Aggregates completed minutes for a goal on a given date by combining
   * routine execution logs and manual progress entries without double counting.
   */
  static aggregateGoalMinutes(
    goal: GoalTarget,
    occurrences: ActivityOccurrence[],
    entries: GoalProgressEntry[],
    date: string
  ): {
    routineMinutes: number;
    manualMinutes: number;
    totalCompletedMinutes: number;
    totalUnitValue: number;
    calculation: CalculatedGoalProgress;
  } {
    let routineMinutes = 0;

    // 1. Calculate duration from completed routine occurrences
    for (const occ of occurrences) {
      if (occ.date !== date || occ.isCancelled) continue;

      let matches = false;
      if (goal.templateIds && goal.templateIds.length > 0) {
        matches = goal.templateIds.includes(occ.templateId);
      } else {
        matches =
          occ.title.toLowerCase().includes(goal.title.toLowerCase()) ||
          goal.categories.includes(occ.category);
      }

      if (matches) {
        const occLog = occ.log;
        if (occLog?.actualDurationMinutes && occLog.actualDurationMinutes > 0) {
          routineMinutes += occLog.actualDurationMinutes;
        } else if (occLog?.status === 'completed') {
          routineMinutes += occ.durationMinutes;
        } else if (occLog?.status === 'partial') {
          routineMinutes += Math.round(occ.durationMinutes * 0.5);
        }
      }
    }

    // 2. Calculate duration from manual progress entries for this goal & date
    let manualMinutes = 0;
    let totalUnitValue = 0;

    for (const entry of entries) {
      if (entry.goalId === goal.id && entry.date === date) {
        manualMinutes += entry.minutes;
        if (entry.unitValue && entry.unitValue > 0) {
          totalUnitValue += entry.unitValue;
        }
      }
    }

    const totalCompletedMinutes = routineMinutes + manualMinutes;
    const config = this.getGoalUnitConfig(goal.id, goal.title);
    const calculation = this.calculateProgress(
      goal.targetMinutes,
      totalCompletedMinutes,
      config.primaryUnit,
      totalUnitValue > 0 ? totalUnitValue : undefined
    );

    return {
      routineMinutes,
      manualMinutes,
      totalCompletedMinutes,
      totalUnitValue,
      calculation,
    };
  }
}
