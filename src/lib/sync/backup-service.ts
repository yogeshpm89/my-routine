import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { OverrideRepository } from '@/lib/repositories/override-repository';
import { LogRepository } from '@/lib/repositories/log-repository';
import { GoalRepository } from '@/lib/repositories/goal-repository';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { getInitialRoutineTemplates, getInitialGoalTargets } from '@/lib/seed-data';
import { canSyncWithFirestore } from '@/lib/firebase/config';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
  GoalTarget,
} from '@/types/routine';

export interface RoutineBackupPackage {
  version: '1.0';
  exportedAt: string;
  userId: string;
  templates: RoutineTemplate[];
  overrides: OccurrenceOverride[];
  logs: ActivityLog[];
  goals: GoalTarget[];
}

export class BackupService {
  static exportAllData(userId: string): RoutineBackupPackage {
    const templates = RoutineRepository.getLocalTemplates(userId);
    const overrides = OverrideRepository.getLocalOverrides(userId);
    const logs = LogRepository.getLocalLogs(userId);
    const goals = GoalRepository.getLocalGoals(userId);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId,
      templates,
      overrides,
      logs,
      goals,
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
  ): { success: boolean; message: string; counts?: { templates: number; logs: number; goals: number } } {
    try {
      const data = JSON.parse(rawJson) as Partial<RoutineBackupPackage>;
      if (!data.templates || !Array.isArray(data.templates)) {
        return { success: false, message: 'Invalid backup file: missing templates list' };
      }

      if (mode === 'replace') {
        const preparedTemplates = data.templates.map((t) => ({ ...t, userId }));
        const preparedOverrides = (data.overrides || []).map((o) => ({ ...o, userId }));
        const preparedLogs = (data.logs || []).map((l) => ({ ...l, userId }));
        const preparedGoals = (data.goals || []).map((g) => ({ ...g, userId }));

        RoutineRepository.saveLocalTemplates(userId, preparedTemplates);
        OverrideRepository.saveLocalOverrides(userId, preparedOverrides);
        LogRepository.saveLocalLogs(userId, preparedLogs);
        GoalRepository.saveLocalGoals(userId, preparedGoals);

        if (canSyncWithFirestore(userId)) {
          preparedTemplates.forEach((t) => RoutineRepository.saveTemplate(t).catch(console.warn));
          preparedOverrides.forEach((o) => OverrideRepository.saveOverride(o).catch(console.warn));
          preparedLogs.forEach((l) => LogRepository.saveLog(l).catch(console.warn));
          preparedGoals.forEach((g) => GoalRepository.saveGoal(g).catch(console.warn));
        }
      } else {
        // Merge mode
        const existingTemplates = RoutineRepository.getLocalTemplates(userId);
        const mergedTemplates = [...existingTemplates];
        (data.templates || []).forEach((newT) => {
          const idx = mergedTemplates.findIndex((t) => t.id === newT.id);
          const item = { ...newT, userId };
          if (idx >= 0) {
            mergedTemplates[idx] = item;
          } else {
            mergedTemplates.push(item);
          }
          if (canSyncWithFirestore(userId)) {
            RoutineRepository.saveTemplate(item).catch(console.warn);
          }
        });
        RoutineRepository.saveLocalTemplates(userId, mergedTemplates);
      }

      return {
        success: true,
        message: 'Backup imported successfully and synced to Firebase',
        counts: {
          templates: data.templates.length,
          logs: data.logs?.length || 0,
          goals: data.goals?.length || 0,
        },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to parse backup JSON: ${err.message}` };
    }
  }

  static resetToDefaultRoutine(userId: string): void {
    const initialTemplates = getInitialRoutineTemplates(userId);
    const initialGoals = getInitialGoalTargets(userId);

    RoutineRepository.saveLocalTemplates(userId, initialTemplates);
    OverrideRepository.saveLocalOverrides(userId, []);
    LogRepository.saveLocalLogs(userId, []);
    GoalRepository.saveLocalGoals(userId, initialGoals);
    MutationQueue.clear(userId);

    if (canSyncWithFirestore(userId)) {
      initialTemplates.forEach((t) => RoutineRepository.saveTemplate(t).catch(console.warn));
      initialGoals.forEach((g) => GoalRepository.saveGoal(g).catch(console.warn));
    }
  }

  static deleteAllUserData(userId: string): void {
    const existingTemplates = RoutineRepository.getLocalTemplates(userId);
    const existingOverrides = OverrideRepository.getLocalOverrides(userId);
    const existingGoals = GoalRepository.getLocalGoals(userId);

    RoutineRepository.saveLocalTemplates(userId, []);
    OverrideRepository.saveLocalOverrides(userId, []);
    LogRepository.saveLocalLogs(userId, []);
    GoalRepository.saveLocalGoals(userId, []);
    MutationQueue.clear(userId);

    if (canSyncWithFirestore(userId)) {
      existingTemplates.forEach((t) => RoutineRepository.deleteTemplate(userId, t.id).catch(console.warn));
      existingOverrides.forEach((o) => OverrideRepository.deleteOverride(userId, o.id).catch(console.warn));
      existingGoals.forEach((g) => GoalRepository.deleteGoal(userId, g.id).catch(console.warn));
    }
  }
}
