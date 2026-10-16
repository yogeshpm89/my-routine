import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { OverrideRepository } from '@/lib/repositories/override-repository';
import { LogRepository } from '@/lib/repositories/log-repository';
import { GoalRepository } from '@/lib/repositories/goal-repository';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { getInitialRoutineTemplates, getInitialGoalTargets } from '@/lib/seed-data';
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
        RoutineRepository.saveLocalTemplates(userId, data.templates.map((t) => ({ ...t, userId })));
        OverrideRepository.saveLocalOverrides(userId, (data.overrides || []).map((o) => ({ ...o, userId })));
        LogRepository.saveLocalLogs(userId, (data.logs || []).map((l) => ({ ...l, userId })));
        GoalRepository.saveLocalGoals(userId, (data.goals || []).map((g) => ({ ...g, userId })));
      } else {
        // Merge mode
        const existingTemplates = RoutineRepository.getLocalTemplates(userId);
        const mergedTemplates = [...existingTemplates];
        (data.templates || []).forEach((newT) => {
          const idx = mergedTemplates.findIndex((t) => t.id === newT.id);
          if (idx >= 0) {
            mergedTemplates[idx] = { ...newT, userId };
          } else {
            mergedTemplates.push({ ...newT, userId });
          }
        });
        RoutineRepository.saveLocalTemplates(userId, mergedTemplates);
      }

      return {
        success: true,
        message: 'Backup imported successfully',
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
  }

  static deleteAllUserData(userId: string): void {
    RoutineRepository.saveLocalTemplates(userId, []);
    OverrideRepository.saveLocalOverrides(userId, []);
    LogRepository.saveLocalLogs(userId, []);
    GoalRepository.saveLocalGoals(userId, []);
    MutationQueue.clear(userId);
  }
}
