import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { OverrideRepository } from '@/lib/repositories/override-repository';
import { LogRepository } from '@/lib/repositories/log-repository';
import { GoalRepository } from '@/lib/repositories/goal-repository';
import { LifeGoalRepository } from '@/lib/repositories/life-goal-repository';
import { DayTemplateRepository } from '@/lib/repositories/day-template-repository';
import { GoalProgressRepository } from '@/lib/repositories/goal-progress-repository';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { getInitialRoutineTemplates, getInitialGoalTargets } from '@/lib/seed-data';
import { getInitialLifeGoals } from '@/lib/seed-goals';
import { getDefaultDayTemplates, getDefaultWeeklyPlanner } from '@/lib/seed-templates';
import { canSyncWithFirestore } from '@/lib/firebase/config';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
  GoalTarget,
} from '@/types/routine';
import { LifeGoal } from '@/types/goals';
import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { GoalProgressEntry } from '@/types/goal-progress';

export interface RoutineBackupPackage {
  version: '1.0' | '1.1';
  exportedAt: string;
  userId: string;
  templates: RoutineTemplate[];
  overrides: OccurrenceOverride[];
  logs: ActivityLog[];
  goals: GoalTarget[];
  lifeGoals?: LifeGoal[];
  dayTemplates?: DayRoutineTemplate[];
  weeklyPlanner?: WeeklyPlannerConfig;
  goalProgress?: GoalProgressEntry[];
}

export class BackupService {
  static exportAllData(userId: string): RoutineBackupPackage {
    const templates = RoutineRepository.getLocalTemplates(userId);
    const overrides = OverrideRepository.getLocalOverrides(userId);
    const logs = LogRepository.getLocalLogs(userId);
    const goals = GoalRepository.getLocalGoals(userId);
    const lifeGoals = LifeGoalRepository.getLocalLifeGoals(userId);
    const dayTemplates = DayTemplateRepository.getLocalTemplates(userId);
    const weeklyPlanner = DayTemplateRepository.getLocalWeeklyPlanner(userId);
    const goalProgress = GoalProgressRepository.getLocalEntries(userId);

    return {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      userId,
      templates,
      overrides,
      logs,
      goals,
      lifeGoals,
      dayTemplates,
      weeklyPlanner,
      goalProgress,
    };
  }

  static triggerDownloadBackup(userId: string): void {
    if (typeof window === 'undefined') return;
    const backup = this.exportAllData(userId);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `my-routine-backup-${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  static importBackupData(
    userId: string,
    rawJson: string,
    mode: 'merge' | 'replace' = 'replace'
  ): {
    success: boolean;
    message: string;
    counts?: {
      templates: number;
      logs: number;
      goals: number;
      dayTemplates?: number;
      goalProgress?: number;
    };
  } {
    try {
      const data = JSON.parse(rawJson) as Partial<RoutineBackupPackage>;
      if (!data.templates || !Array.isArray(data.templates)) {
        return { success: false, message: 'Invalid backup file: missing templates list' };
      }

      const preparedTemplates = data.templates.map((t) => ({ ...t, userId }));
      const preparedOverrides = (data.overrides || []).map((o) => ({ ...o, userId }));
      const preparedLogs = (data.logs || []).map((l) => ({ ...l, userId }));
      const preparedGoals = (data.goals || []).map((g) => ({ ...g, userId }));
      const preparedLifeGoals = (data.lifeGoals || []).map((g) => ({ ...g, userId }));

      let preparedDayTemplates: DayRoutineTemplate[] = [];
      let preparedWeeklyPlanner: WeeklyPlannerConfig;

      if (data.dayTemplates && Array.isArray(data.dayTemplates) && data.dayTemplates.length > 0) {
        preparedDayTemplates = data.dayTemplates.map((dt) => ({
          ...dt,
          userId,
          blocks: dt.blocks.map((b) => ({ ...b, userId })),
        }));
        preparedWeeklyPlanner = data.weeklyPlanner
          ? { ...data.weeklyPlanner, userId }
          : getDefaultWeeklyPlanner(
              userId,
              preparedDayTemplates.find((t) => t.isDefault)?.id || preparedDayTemplates[0].id
            );
      } else {
        // Upgrade legacy v1.0 backup: synthesize DayRoutineTemplate from templates array
        const defaultTplId = `tpl_restored_weekday_${userId}`;
        const weekendTplId = `tpl_restored_weekend_${userId}`;
        const now = Date.now();
        preparedDayTemplates = [
          {
            id: defaultTplId,
            userId,
            name: 'Restored Weekday Routine',
            description: 'Routine blocks restored from backup',
            color: '#3b82f6',
            icon: 'briefcase',
            blocks: preparedTemplates,
            isDefault: true,
            schemaVersion: 1,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: weekendTplId,
            userId,
            name: 'Weekend Routine',
            description: 'Relaxed weekend schedule',
            color: '#10b981',
            icon: 'sun',
            blocks: preparedTemplates,
            isDefault: false,
            schemaVersion: 1,
            createdAt: now,
            updatedAt: now,
          },
        ];
        preparedWeeklyPlanner = getDefaultWeeklyPlanner(userId, defaultTplId, weekendTplId);
      }

      if (mode === 'replace') {
        RoutineRepository.saveLocalTemplates(userId, preparedTemplates);
        OverrideRepository.saveLocalOverrides(userId, preparedOverrides);
        LogRepository.saveLocalLogs(userId, preparedLogs);
        GoalRepository.saveLocalGoals(userId, preparedGoals);
        if (preparedLifeGoals.length > 0) {
          LifeGoalRepository.saveLocalLifeGoals(userId, preparedLifeGoals);
        }
        DayTemplateRepository.saveLocalTemplates(userId, preparedDayTemplates);
        DayTemplateRepository.saveLocalWeeklyPlanner(userId, preparedWeeklyPlanner);

        if (canSyncWithFirestore(userId)) {
          preparedTemplates.forEach((t) => RoutineRepository.saveTemplate(t).catch(console.warn));
          preparedOverrides.forEach((o) => OverrideRepository.saveOverride(o).catch(console.warn));
          preparedLogs.forEach((l) => LogRepository.saveLog(l).catch(console.warn));
          preparedGoals.forEach((g) => GoalRepository.saveGoal(g).catch(console.warn));
          preparedLifeGoals.forEach((g) => LifeGoalRepository.saveGoal(g).catch(console.warn));
          preparedDayTemplates.forEach((dt) => DayTemplateRepository.saveTemplate(dt).catch(console.warn));
          DayTemplateRepository.saveWeeklyPlanner(preparedWeeklyPlanner).catch(console.warn);
        }
      } else {
        // Merge mode
        const existingTemplates = RoutineRepository.getLocalTemplates(userId);
        const mergedTemplates = [...existingTemplates];
        preparedTemplates.forEach((newT) => {
          const idx = mergedTemplates.findIndex((t) => t.id === newT.id);
          if (idx >= 0) {
            mergedTemplates[idx] = newT;
          } else {
            mergedTemplates.push(newT);
          }
          if (canSyncWithFirestore(userId)) {
            RoutineRepository.saveTemplate(newT).catch(console.warn);
          }
        });
        RoutineRepository.saveLocalTemplates(userId, mergedTemplates);

        if (preparedLifeGoals.length > 0) {
          const existingLifeGoals = LifeGoalRepository.getLocalLifeGoals(userId);
          const mergedLifeGoals = [...existingLifeGoals];
          preparedLifeGoals.forEach((newG) => {
            const idx = mergedLifeGoals.findIndex((g) => g.id === newG.id);
            if (idx >= 0) {
              mergedLifeGoals[idx] = newG;
            } else {
              mergedLifeGoals.push(newG);
            }
            if (canSyncWithFirestore(userId)) {
              LifeGoalRepository.saveGoal(newG).catch(console.warn);
            }
          });
          LifeGoalRepository.saveLocalLifeGoals(userId, mergedLifeGoals);
        }

        // Merge day templates
        const existingDayTemplates = DayTemplateRepository.getLocalTemplates(userId);
        const mergedDayTemplates = [...existingDayTemplates];
        preparedDayTemplates.forEach((newDT) => {
          const idx = mergedDayTemplates.findIndex((t) => t.id === newDT.id);
          if (idx >= 0) {
            mergedDayTemplates[idx] = newDT;
          } else {
            mergedDayTemplates.push(newDT);
          }
          if (canSyncWithFirestore(userId)) {
            DayTemplateRepository.saveTemplate(newDT).catch(console.warn);
          }
        });
        DayTemplateRepository.saveLocalTemplates(userId, mergedDayTemplates);

        // Merge goal progress entries
        if (data.goalProgress && Array.isArray(data.goalProgress)) {
          const existingProgress = GoalProgressRepository.getLocalEntries(userId);
          const mergedProgress = [...existingProgress];
          data.goalProgress.forEach((p) => {
            const entryWithUser = { ...p, userId };
            const idx = mergedProgress.findIndex((item) => item.id === entryWithUser.id);
            if (idx >= 0) {
              mergedProgress[idx] = entryWithUser;
            } else {
              mergedProgress.push(entryWithUser);
            }
            if (canSyncWithFirestore(userId)) {
              GoalProgressRepository.addEntry(entryWithUser).catch(console.warn);
            }
          });
          GoalProgressRepository.saveLocalEntries(userId, mergedProgress);
        }
      }

      return {
        success: true,
        message: 'Backup imported successfully and synchronized.',
        counts: {
          templates: data.templates.length,
          logs: data.logs?.length || 0,
          goals: data.goals?.length || 0,
          dayTemplates: preparedDayTemplates.length,
          goalProgress: data.goalProgress?.length || 0,
        },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to parse backup JSON: ${err?.message || 'Unknown error'}` };
    }
  }

  static resetToDefaultRoutine(userId: string): void {
    const initialTemplates = getInitialRoutineTemplates(userId);
    const initialGoals = getInitialGoalTargets(userId);
    const initialLifeGoals = getInitialLifeGoals(userId);
    const initialDayTemplates = getDefaultDayTemplates(userId);
    const defaultTplId = initialDayTemplates.find((t) => t.isDefault)?.id || initialDayTemplates[0].id;
    const weekendTplId = initialDayTemplates.find((t) => !t.isDefault)?.id;
    const initialPlanner = getDefaultWeeklyPlanner(userId, defaultTplId, weekendTplId);

    RoutineRepository.saveLocalTemplates(userId, initialTemplates);
    OverrideRepository.saveLocalOverrides(userId, []);
    LogRepository.saveLocalLogs(userId, []);
    GoalRepository.saveLocalGoals(userId, initialGoals);
    LifeGoalRepository.saveLocalLifeGoals(userId, initialLifeGoals);
    DayTemplateRepository.saveLocalTemplates(userId, initialDayTemplates);
    DayTemplateRepository.saveLocalWeeklyPlanner(userId, initialPlanner);
    GoalProgressRepository.saveLocalEntries(userId, []);
    MutationQueue.clear(userId);

    if (canSyncWithFirestore(userId)) {
      initialTemplates.forEach((t) => RoutineRepository.saveTemplate(t).catch(console.warn));
      initialGoals.forEach((g) => GoalRepository.saveGoal(g).catch(console.warn));
      initialLifeGoals.forEach((g) => LifeGoalRepository.saveGoal(g).catch(console.warn));
      initialDayTemplates.forEach((dt) => DayTemplateRepository.saveTemplate(dt).catch(console.warn));
      DayTemplateRepository.saveWeeklyPlanner(initialPlanner).catch(console.warn);
    }
  }

  static deleteAllUserData(userId: string): void {
    const existingTemplates = RoutineRepository.getLocalTemplates(userId);
    const existingOverrides = OverrideRepository.getLocalOverrides(userId);
    const existingGoals = GoalRepository.getLocalGoals(userId);
    const existingLifeGoals = LifeGoalRepository.getLocalLifeGoals(userId);
    const existingDayTemplates = DayTemplateRepository.getLocalTemplates(userId);
    const existingProgress = GoalProgressRepository.getLocalEntries(userId);

    RoutineRepository.saveLocalTemplates(userId, []);
    OverrideRepository.saveLocalOverrides(userId, []);
    LogRepository.saveLocalLogs(userId, []);
    GoalRepository.saveLocalGoals(userId, []);
    LifeGoalRepository.saveLocalLifeGoals(userId, []);
    GoalProgressRepository.saveLocalEntries(userId, []);
    DayTemplateRepository.saveLocalWeeklyPlanner(userId, {
      userId,
      assignments: {},
      defaultTemplateId: '',
      dateOverrides: {},
      updatedAt: Date.now(),
    });
    MutationQueue.clear(userId);

    if (canSyncWithFirestore(userId)) {
      existingTemplates.forEach((t) => RoutineRepository.deleteTemplate(userId, t.id).catch(console.warn));
      existingOverrides.forEach((o) => OverrideRepository.deleteOverride(userId, o.id).catch(console.warn));
      existingGoals.forEach((g) => GoalRepository.deleteGoal(userId, g.id).catch(console.warn));
      existingLifeGoals.forEach((g) => LifeGoalRepository.deleteGoal(userId, g.id).catch(console.warn));
      existingDayTemplates.forEach((dt) => DayTemplateRepository.deleteTemplate(userId, dt.id).catch(console.warn));
      existingProgress.forEach((p) => GoalProgressRepository.deleteEntry(userId, p.id).catch(console.warn));
    }
  }
}
