import { RoutineTemplate } from '@/types/routine';
import { getInitialRoutineTemplates } from '@/lib/seed-data';
import { db, canSyncWithFirestore } from '@/lib/firebase/config';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'my_routine_templates_';

export class RoutineRepository {
  private static getLocalKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  static getLocalTemplates(userId: string): RoutineTemplate[] {
    if (typeof window === 'undefined') {
      return getInitialRoutineTemplates(userId);
    }
    const raw = localStorage.getItem(this.getLocalKey(userId));
    if (!raw) {
      const guestRaw = userId !== 'local-default-user' ? localStorage.getItem(this.getLocalKey('local-default-user')) : null;
      if (guestRaw) {
        try {
          const guestTemplates = (JSON.parse(guestRaw) as RoutineTemplate[]).map((t) => ({
            ...t,
            userId,
            isArchived: t.isArchived ?? false,
          }));
          this.saveLocalTemplates(userId, guestTemplates);
          return guestTemplates;
        } catch {
          // ignore fallback
        }
      }
      const initial = getInitialRoutineTemplates(userId);
      this.saveLocalTemplates(userId, initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(raw) as RoutineTemplate[];
      return parsed.map((t) => ({
        ...t,
        isArchived: t.isArchived ?? false,
      }));
    } catch {
      return getInitialRoutineTemplates(userId);
    }
  }

  static getActiveLocalTemplates(userId: string): RoutineTemplate[] {
    return this.getLocalTemplates(userId).filter((t) => !t.isArchived);
  }

  static getArchivedLocalTemplates(userId: string): RoutineTemplate[] {
    return this.getLocalTemplates(userId).filter((t) => Boolean(t.isArchived));
  }

  static saveLocalTemplates(userId: string, templates: RoutineTemplate[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getLocalKey(userId), JSON.stringify(templates));
  }

  static async getTemplates(userId: string): Promise<RoutineTemplate[]> {
    // 1. Fetch from local cache first for instant responsiveness
    const local = this.getLocalTemplates(userId);

    // 2. If Firebase is configured and online, sync all templates (including archived)
    if (canSyncWithFirestore(userId)) {
      try {
        const templatesCol = collection(db, `users/${userId}/templates`);
        const snapshot = await getDocs(templatesCol);
        if (!snapshot.empty) {
          const remoteTemplates: RoutineTemplate[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as RoutineTemplate;
            remoteTemplates.push({
              ...data,
              isArchived: data.isArchived ?? false,
            });
          });
          const pendingIds = new Set(
            MutationQueue.getQueue(userId)
              .filter((m) => m.collection === 'templates')
              .map((m) => m.docId)
          );
          const mergedMap = new Map<string, RoutineTemplate>();
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
          // If remote is empty, seed local templates up to Firestore
          for (const t of local) {
            await setDoc(doc(db, `users/${userId}/templates`, t.id), t);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch templates from Firestore, using local cache:', err);
      }
    }

    return local;
  }

  static subscribeTemplates(
    userId: string,
    onData: (templates: RoutineTemplate[]) => void,
    onError?: (error: unknown) => void
  ): () => void {
    const local = this.getLocalTemplates(userId);
    onData(local);

    if (!canSyncWithFirestore(userId)) {
      return () => {};
    }

    try {
      const templatesCol = collection(db, `users/${userId}/templates`);
      const unsubscribe = onSnapshot(
        templatesCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteTemplates: RoutineTemplate[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as RoutineTemplate;
              remoteTemplates.push({
                ...data,
                isArchived: data.isArchived ?? false,
              });
            });
            const pendingIds = new Set(
              MutationQueue.getQueue(userId)
                .filter((m) => m.collection === 'templates')
                .map((m) => m.docId)
            );
            const localTemplates = this.getLocalTemplates(userId);
            const mergedMap = new Map<string, RoutineTemplate>();
            remoteTemplates.forEach((t) => mergedMap.set(t.id, t));
            localTemplates.forEach((t) => {
              if (pendingIds.has(t.id) || !mergedMap.has(t.id)) {
                mergedMap.set(t.id, t);
              }
            });
            const merged = Array.from(mergedMap.values());
            this.saveLocalTemplates(userId, merged);
            onData(merged);
          } else if (local.length > 0) {
            for (const t of local) {
              setDoc(doc(db, `users/${userId}/templates`, t.id), t).catch(console.warn);
            }
          } else {
            this.saveLocalTemplates(userId, []);
            onData([]);
          }
        },
        (err) => {
          console.warn('Realtime template listener error:', err);
          if (onError) onError(err);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Failed to attach realtime template listener:', err);
      if (onError) onError(err);
      return () => {};
    }
  }

  static async archiveTemplate(userId: string, templateId: string): Promise<RoutineTemplate | null> {
    const templates = this.getLocalTemplates(userId);
    const target = templates.find((t) => t.id === templateId);
    if (!target) return null;

    const archived: RoutineTemplate = {
      ...target,
      isArchived: true,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveTemplate(archived);
    return archived;
  }

  static async unarchiveTemplate(userId: string, templateId: string): Promise<RoutineTemplate | null> {
    const templates = this.getLocalTemplates(userId);
    const target = templates.find((t) => t.id === templateId);
    if (!target) return null;

    const restored: RoutineTemplate = {
      ...target,
      isArchived: false,
      archivedAt: null,
      updatedAt: Date.now(),
    };

    await this.saveTemplate(restored);
    return restored;
  }

  static async saveTemplate(template: RoutineTemplate): Promise<void> {
    const templates = this.getLocalTemplates(template.userId);
    const index = templates.findIndex((t) => t.id === template.id);
    const updated = [...templates];
    const now = Date.now();
    const templateToSave = { ...template, updatedAt: now };

    if (index >= 0) {
      updated[index] = templateToSave;
    } else {
      updated.push(templateToSave);
    }
    this.saveLocalTemplates(template.userId, updated);

    // Enqueue mutation for guaranteed offline-first sync
    MutationQueue.enqueue(template.userId, 'templates', 'set', template.id, templateToSave);

    if (canSyncWithFirestore(template.userId)) {
      try {
        await setDoc(doc(db, `users/${template.userId}/templates`, template.id), templateToSave);
        // Clear from queue if direct write succeeded
        const q = MutationQueue.getQueue(template.userId);
        const m = q.find((item) => item.collection === 'templates' && item.docId === template.id);
        if (m) MutationQueue.dequeue(template.userId, m.id);
      } catch (err) {
        console.warn('Failed to persist template to Firestore, queued locally:', err);
      }
    }
  }

  static async deleteTemplate(userId: string, templateId: string): Promise<void> {
    const templates = this.getLocalTemplates(userId);
    const filtered = templates.filter((t) => t.id !== templateId);
    this.saveLocalTemplates(userId, filtered);

    // Enqueue delete mutation
    MutationQueue.enqueue(userId, 'templates', 'delete', templateId);

    if (canSyncWithFirestore(userId)) {
      try {
        await deleteDoc(doc(db, `users/${userId}/templates`, templateId));
        const q = MutationQueue.getQueue(userId);
        const m = q.find((item) => item.collection === 'templates' && item.docId === templateId);
        if (m) MutationQueue.dequeue(userId, m.id);
      } catch (err) {
        console.warn('Failed to delete template from Firestore, queued locally:', err);
      }
    }
  }

  static async duplicateTemplate(userId: string, templateId: string): Promise<RoutineTemplate | null> {
    const templates = this.getLocalTemplates(userId);
    const original = templates.find((t) => t.id === templateId);
    if (!original) return null;

    const newId = `template_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicate: RoutineTemplate = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveTemplate(duplicate);
    return duplicate;
  }

  static async toggleArchive(userId: string, templateId: string): Promise<void> {
    const templates = this.getLocalTemplates(userId);
    const target = templates.find((t) => t.id === templateId);
    if (!target) return;

    if (target.isArchived) {
      await this.unarchiveTemplate(userId, templateId);
    } else {
      await this.archiveTemplate(userId, templateId);
    }
  }
}
