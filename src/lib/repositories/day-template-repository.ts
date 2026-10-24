import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { getDefaultDayTemplates, getDefaultWeeklyPlanner } from '@/lib/seed-templates';
import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { db, canSyncWithFirestore, cleanForFirestore } from '@/lib/firebase/config';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { SyncEngine } from '@/lib/sync/sync-engine';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

const DAY_TEMPLATES_STORAGE_KEY_PREFIX = 'my_routine_day_templates_';
const WEEKLY_PLANNER_STORAGE_KEY_PREFIX = 'my_routine_weekly_planner_';

export class DayTemplateRepository {
  private static getTemplatesLocalKey(userId: string): string {
    return `${DAY_TEMPLATES_STORAGE_KEY_PREFIX}${userId}`;
  }

  private static getPlannerLocalKey(userId: string): string {
    return `${WEEKLY_PLANNER_STORAGE_KEY_PREFIX}${userId}`;
  }

  // --- Local Storage Accessors ---

  static getLocalTemplates(userId: string): DayRoutineTemplate[] {
    if (typeof window === 'undefined') {
      return getDefaultDayTemplates(userId);
    }

    const raw = localStorage.getItem(this.getTemplatesLocalKey(userId));
    if (!raw) {
      // 1. Try guest fallback if user signed in from guest
      if (userId !== 'local-default-user') {
        const guestRaw = localStorage.getItem(this.getTemplatesLocalKey('local-default-user'));
        if (guestRaw) {
          try {
            const guestTemplates = (JSON.parse(guestRaw) as DayRoutineTemplate[]).map((t) => ({
              ...t,
              userId,
              blocks: t.blocks.map((b) => ({ ...b, userId })),
            }));
            this.saveLocalTemplates(userId, guestTemplates);
            return guestTemplates;
          } catch {
            // ignore fallback
          }
        }
      }

      // 2. Migration: Package existing individual routine blocks if any exist
      const existingRoutineBlocks = RoutineRepository.getLocalTemplates(userId);
      const defaults = getDefaultDayTemplates(userId);

      if (existingRoutineBlocks && existingRoutineBlocks.length > 0) {
        // Replace default weekday routine blocks with user's existing blocks
        const migratedTemplates = defaults.map((tpl) => {
          if (tpl.isDefault) {
            return {
              ...tpl,
              blocks: existingRoutineBlocks,
            };
          }
          return tpl;
        });
        this.saveLocalTemplates(userId, migratedTemplates);
        return migratedTemplates;
      }

      // 3. Fallback to clean defaults
      this.saveLocalTemplates(userId, defaults);
      return defaults;
    }

    try {
      return JSON.parse(raw) as DayRoutineTemplate[];
    } catch {
      const defaults = getDefaultDayTemplates(userId);
      this.saveLocalTemplates(userId, defaults);
      return defaults;
    }
  }

  static saveLocalTemplates(userId: string, templates: DayRoutineTemplate[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getTemplatesLocalKey(userId), JSON.stringify(templates));
  }

  static getLocalWeeklyPlanner(userId: string): WeeklyPlannerConfig {
    if (typeof window === 'undefined') {
      const templates = this.getLocalTemplates(userId);
      const defaultId = templates.find((t) => t.isDefault)?.id || templates[0]?.id || `tpl_weekday_${userId}`;
      const weekendId = templates.find((t) => !t.isDefault)?.id;
      return getDefaultWeeklyPlanner(userId, defaultId, weekendId);
    }

    const raw = localStorage.getItem(this.getPlannerLocalKey(userId));
    if (!raw) {
      if (userId !== 'local-default-user') {
        const guestRaw = localStorage.getItem(this.getPlannerLocalKey('local-default-user'));
        if (guestRaw) {
          try {
            const guestPlanner = JSON.parse(guestRaw) as WeeklyPlannerConfig;
            const userPlanner: WeeklyPlannerConfig = {
              ...guestPlanner,
              userId,
            };
            this.saveLocalWeeklyPlanner(userId, userPlanner);
            return userPlanner;
          } catch {
            // ignore fallback
          }
        }
      }

      const templates = this.getLocalTemplates(userId);
      const defaultId = templates.find((t) => t.isDefault)?.id || templates[0]?.id || `tpl_weekday_${userId}`;
      const weekendId = templates.find((t) => !t.isDefault)?.id;
      const initialPlanner = getDefaultWeeklyPlanner(userId, defaultId, weekendId);
      this.saveLocalWeeklyPlanner(userId, initialPlanner);
      return initialPlanner;
    }

    try {
      return JSON.parse(raw) as WeeklyPlannerConfig;
    } catch {
      const templates = this.getLocalTemplates(userId);
      const defaultId = templates.find((t) => t.isDefault)?.id || templates[0]?.id || `tpl_weekday_${userId}`;
      const weekendId = templates.find((t) => !t.isDefault)?.id;
      const fallback = getDefaultWeeklyPlanner(userId, defaultId, weekendId);
      this.saveLocalWeeklyPlanner(userId, fallback);
      return fallback;
    }
  }

  static saveLocalWeeklyPlanner(userId: string, config: WeeklyPlannerConfig): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getPlannerLocalKey(userId), JSON.stringify(config));
  }

  // --- Async Repository Methods & Cloud Sync ---

  static async getTemplates(userId: string): Promise<DayRoutineTemplate[]> {
    const local = this.getLocalTemplates(userId);

    if (canSyncWithFirestore(userId)) {
      try {
        const templatesCol = collection(db, `users/${userId}/day_templates`);
        const snapshot = await getDocs(templatesCol);
        if (!snapshot.empty) {
          const remoteTemplates: DayRoutineTemplate[] = [];
          snapshot.forEach((d) => {
            remoteTemplates.push(d.data() as DayRoutineTemplate);
          });

          const pendingIds = new Set(
            MutationQueue.getQueue(userId)
              .filter((m) => m.collection === 'day_templates')
              .map((m) => m.docId)
          );

          const mergedMap = new Map<string, DayRoutineTemplate>();
          remoteTemplates.forEach((t) => mergedMap.set(t.id, t));
          local.forEach((t) => {
            if (pendingIds.has(t.id) || !mergedMap.has(t.id)) {
              mergedMap.set(t.id, t);
            }
          });

          const merged = Array.from(mergedMap.values());
          this.saveLocalTemplates(userId, merged);
          return merged;
        } else if (local.length > 0) {
          for (const t of local) {
            await setDoc(doc(db, `users/${userId}/day_templates`, t.id), cleanForFirestore(t));
          }
        }
      } catch (err) {
        console.warn('Failed to fetch day templates from Firestore, using local cache:', err);
      }
    }

    return local;
  }

  static async getTemplateById(userId: string, templateId: string): Promise<DayRoutineTemplate | null> {
    const templates = await this.getTemplates(userId);
    return templates.find((t) => t.id === templateId) || null;
  }

  static async saveTemplate(template: DayRoutineTemplate): Promise<DayRoutineTemplate> {
    const templates = this.getLocalTemplates(template.userId);
    const index = templates.findIndex((t) => t.id === template.id);
    const updated = [...templates];
    const now = Date.now();
    const templateToSave: DayRoutineTemplate = {
      ...template,
      updatedAt: now,
    };

    if (index >= 0) {
      updated[index] = templateToSave;
    } else {
      updated.push(templateToSave);
    }
    this.saveLocalTemplates(template.userId, updated);

    // Enqueue mutation for guaranteed offline-first sync
    MutationQueue.enqueue(template.userId, 'day_templates', 'set', template.id, templateToSave);

    if (canSyncWithFirestore(template.userId)) {
      try {
        await setDoc(
          doc(db, `users/${template.userId}/day_templates`, template.id),
          cleanForFirestore(templateToSave)
        );
        const q = MutationQueue.getQueue(template.userId);
        const m = q.find((item) => item.collection === 'day_templates' && item.docId === template.id);
        if (m) MutationQueue.dequeue(template.userId, m.id);
        SyncEngine.notifyListeners(template.userId);
      } catch (err) {
        console.warn('Failed to persist day template to Firestore, queued locally:', err);
      }
    }

    return templateToSave;
  }

  static async deleteTemplate(userId: string, templateId: string): Promise<void> {
    const templates = this.getLocalTemplates(userId);
    const target = templates.find((t) => t.id === templateId);
    if (!target) return;

    // Check if template is assigned in Weekly Planner
    const planner = this.getLocalWeeklyPlanner(userId);
    const assignedDays = Object.entries(planner.assignments)
      .filter(([_, id]) => id === templateId)
      .map(([day]) => day);

    if (planner.defaultTemplateId === templateId || assignedDays.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const mappedDays = assignedDays.map((d) => dayNames[Number(d)] || d).join(', ');
      throw new Error(
        `Cannot delete template "${target.name}" because it is currently assigned in the Weekly Planner${
          assignedDays.length > 0 ? ` (${mappedDays})` : ''
        }${planner.defaultTemplateId === templateId ? ' as default fallback' : ''}. Please reassign the schedule first.`
      );
    }

    const filtered = templates.filter((t) => t.id !== templateId);
    this.saveLocalTemplates(userId, filtered);

    // Enqueue delete mutation
    MutationQueue.enqueue(userId, 'day_templates', 'delete', templateId);

    if (canSyncWithFirestore(userId)) {
      try {
        await deleteDoc(doc(db, `users/${userId}/day_templates`, templateId));
        const q = MutationQueue.getQueue(userId);
        const m = q.find((item) => item.collection === 'day_templates' && item.docId === templateId);
        if (m) MutationQueue.dequeue(userId, m.id);
        SyncEngine.notifyListeners(userId);
      } catch (err) {
        console.warn('Failed to delete day template from Firestore, queued locally:', err);
      }
    }
  }

  static async duplicateTemplate(
    userId: string,
    sourceTemplateId: string,
    newName?: string
  ): Promise<DayRoutineTemplate> {
    const templates = this.getLocalTemplates(userId);
    const source = templates.find((t) => t.id === sourceTemplateId);
    if (!source) {
      throw new Error(`Source template with ID "${sourceTemplateId}" not found.`);
    }

    const now = Date.now();
    const newId = `tpl_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const clonedBlocks = source.blocks.map((block, idx) => ({
      ...block,
      id: `block_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: now,
      updatedAt: now,
    }));

    const duplicated: DayRoutineTemplate = {
      ...source,
      id: newId,
      userId,
      name: newName || `${source.name} (Copy)`,
      isDefault: false,
      blocks: clonedBlocks,
      createdAt: now,
      updatedAt: now,
    };

    return await this.saveTemplate(duplicated);
  }

  static async getWeeklyPlanner(userId: string): Promise<WeeklyPlannerConfig> {
    const local = this.getLocalWeeklyPlanner(userId);

    if (canSyncWithFirestore(userId)) {
      try {
        const configDoc = doc(db, `users/${userId}/weekly_planner/config`);
        const snapshot = await getDoc(configDoc);
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as WeeklyPlannerConfig;
          const pending = MutationQueue.getQueue(userId).find(
            (m) => m.collection === 'weekly_planner' && m.docId === 'config'
          );
          const finalData = pending?.payload || remoteData;
          this.saveLocalWeeklyPlanner(userId, finalData);
          return finalData;
        } else {
          await setDoc(configDoc, cleanForFirestore(local));
        }
      } catch (err) {
        console.warn('Failed to fetch weekly planner from Firestore, using local cache:', err);
      }
    }

    return local;
  }

  static async saveWeeklyPlanner(config: WeeklyPlannerConfig): Promise<WeeklyPlannerConfig> {
    const now = Date.now();
    const configToSave: WeeklyPlannerConfig = {
      ...config,
      updatedAt: now,
    };

    this.saveLocalWeeklyPlanner(config.userId, configToSave);
    MutationQueue.enqueue(config.userId, 'weekly_planner', 'set', 'config', configToSave);

    if (canSyncWithFirestore(config.userId)) {
      try {
        await setDoc(
          doc(db, `users/${config.userId}/weekly_planner/config`),
          cleanForFirestore(configToSave)
        );
        const q = MutationQueue.getQueue(config.userId);
        const m = q.find((item) => item.collection === 'weekly_planner' && item.docId === 'config');
        if (m) MutationQueue.dequeue(config.userId, m.id);
        SyncEngine.notifyListeners(config.userId);
      } catch (err) {
        console.warn('Failed to save weekly planner to Firestore, queued locally:', err);
      }
    }

    return configToSave;
  }

  static async setDayAssignment(userId: string, dayOfWeek: number, templateId: string): Promise<WeeklyPlannerConfig> {
    const planner = this.getLocalWeeklyPlanner(userId);
    const updatedAssignments = {
      ...planner.assignments,
      [String(dayOfWeek)]: templateId,
    };

    const updatedConfig: WeeklyPlannerConfig = {
      ...planner,
      assignments: updatedAssignments,
    };

    return await this.saveWeeklyPlanner(updatedConfig);
  }

  static async setDateOverride(userId: string, dateStr: string, templateId: string): Promise<WeeklyPlannerConfig> {
    const planner = this.getLocalWeeklyPlanner(userId);
    const updatedDateOverrides = {
      ...planner.dateOverrides,
      [dateStr]: templateId,
    };

    const updatedConfig: WeeklyPlannerConfig = {
      ...planner,
      dateOverrides: updatedDateOverrides,
    };

    return await this.saveWeeklyPlanner(updatedConfig);
  }

  static async clearDateOverride(userId: string, dateStr: string): Promise<WeeklyPlannerConfig> {
    const planner = this.getLocalWeeklyPlanner(userId);
    const updatedDateOverrides = { ...planner.dateOverrides };
    delete updatedDateOverrides[dateStr];

    const updatedConfig: WeeklyPlannerConfig = {
      ...planner,
      dateOverrides: updatedDateOverrides,
    };

    return await this.saveWeeklyPlanner(updatedConfig);
  }

  static async initializeTemplates(userId: string): Promise<{
    templates: DayRoutineTemplate[];
    planner: WeeklyPlannerConfig;
  }> {
    const templates = await this.getTemplates(userId);
    const planner = await this.getWeeklyPlanner(userId);
    return { templates, planner };
  }
}
