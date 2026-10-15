import { RoutineTemplate } from '@/types/routine';
import { getInitialRoutineTemplates } from '@/lib/seed-data';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
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
      const initial = getInitialRoutineTemplates(userId);
      this.saveLocalTemplates(userId, initial);
      return initial;
    }
    try {
      return JSON.parse(raw) as RoutineTemplate[];
    } catch {
      return getInitialRoutineTemplates(userId);
    }
  }

  static saveLocalTemplates(userId: string, templates: RoutineTemplate[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getLocalKey(userId), JSON.stringify(templates));
  }

  static async getTemplates(userId: string): Promise<RoutineTemplate[]> {
    // 1. Fetch from local cache first for instant responsiveness
    const local = this.getLocalTemplates(userId);

    // 2. If Firebase is configured and online, sync from Firestore
    if (isFirebaseConfigured && db && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const templatesCol = collection(db, `users/${userId}/templates`);
        const snapshot = await getDocs(query(templatesCol, where('isArchived', '==', false)));
        if (!snapshot.empty) {
          const remoteTemplates: RoutineTemplate[] = [];
          snapshot.forEach((d) => remoteTemplates.push(d.data() as RoutineTemplate));
          this.saveLocalTemplates(userId, remoteTemplates);
          return remoteTemplates;
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

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, `users/${template.userId}/templates`, template.id), templateToSave);
      } catch (err) {
        console.warn('Failed to persist template to Firestore, queued locally:', err);
      }
    }
  }

  static async deleteTemplate(userId: string, templateId: string): Promise<void> {
    const templates = this.getLocalTemplates(userId);
    const filtered = templates.filter((t) => t.id !== templateId);
    this.saveLocalTemplates(userId, filtered);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, `users/${userId}/templates`, templateId));
      } catch (err) {
        console.warn('Failed to delete template from Firestore:', err);
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

    await this.saveTemplate({
      ...target,
      isArchived: !target.isArchived,
    });
  }
}
