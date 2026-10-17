import { AiActionConfig, AiActionConfigSchema } from '@/types/ai';
import { getStarterTemplates } from '@/lib/ai/starter-templates';
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

const STORAGE_KEY_PREFIX = 'my_routine_ai_actions_';

export class AiActionRepository {
  private static getLocalKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  static getLocalActions(userId: string): AiActionConfig[] {
    if (typeof window === 'undefined') {
      return getStarterTemplates(userId);
    }
    const raw = localStorage.getItem(this.getLocalKey(userId));
    if (!raw) {
      const initial = getStarterTemplates(userId);
      this.saveLocalActions(userId, initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(raw) as AiActionConfig[];
      return parsed.map((a) => AiActionConfigSchema.parse(a));
    } catch {
      const fallback = getStarterTemplates(userId);
      this.saveLocalActions(userId, fallback);
      return fallback;
    }
  }

  static saveLocalActions(userId: string, actions: AiActionConfig[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getLocalKey(userId), JSON.stringify(actions));
  }

  static async getActions(userId: string): Promise<AiActionConfig[]> {
    const local = this.getLocalActions(userId);

    if (canSyncWithFirestore(userId)) {
      try {
        const colRef = collection(db, `users/${userId}/ai_actions`);
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
          const remote: AiActionConfig[] = [];
          snapshot.forEach((d) => {
            try {
              remote.push(AiActionConfigSchema.parse(d.data()));
            } catch {
              // skip malformed
            }
          });

          const pendingIds = new Set(
            MutationQueue.getQueue(userId)
              .filter((m) => m.collection === 'ai_actions')
              .map((m) => m.docId)
          );

          const mergedMap = new Map<string, AiActionConfig>();
          remote.forEach((a) => mergedMap.set(a.id, a));
          local.forEach((a) => {
            if (pendingIds.has(a.id) || !mergedMap.has(a.id)) {
              mergedMap.set(a.id, a);
            }
          });

          const merged = Array.from(mergedMap.values());
          this.saveLocalActions(userId, merged);
          return merged;
        } else if (local.length > 0) {
          // Push initial local starter templates up to Firestore
          for (const item of local) {
            setDoc(doc(db, `users/${userId}/ai_actions`, item.id), item).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Failed to fetch remote AI actions:', err);
      }
    }

    return local;
  }

  static async getAction(userId: string, actionId: string): Promise<AiActionConfig | null> {
    const local = this.getLocalActions(userId);
    const found = local.find((a) => a.id === actionId);
    if (found) return found;

    const all = await this.getActions(userId);
    return all.find((a) => a.id === actionId) || null;
  }

  static async saveAction(action: AiActionConfig): Promise<void> {
    const validated = AiActionConfigSchema.parse(action);
    const userId = validated.userId;

    // 1. Update local cache
    const current = this.getLocalActions(userId);
    const idx = current.findIndex((a) => a.id === validated.id);
    if (idx >= 0) {
      current[idx] = validated;
    } else {
      current.push(validated);
    }
    this.saveLocalActions(userId, current);

    // 2. Sync to Firestore or queue offline
    if (canSyncWithFirestore(userId)) {
      try {
        const docRef = doc(db, `users/${userId}/ai_actions`, validated.id);
        await setDoc(docRef, validated);
      } catch (err) {
        console.warn('Firestore saveAction error, enqueuing offline mutation:', err);
        MutationQueue.enqueue(userId, 'ai_actions', 'set', validated.id, validated);
      }
    } else {
      MutationQueue.enqueue(userId, 'ai_actions', 'set', validated.id, validated);
    }
  }

  static async deleteAction(userId: string, actionId: string): Promise<void> {
    // 1. Update local cache
    const current = this.getLocalActions(userId);
    const filtered = current.filter((a) => a.id !== actionId);
    this.saveLocalActions(userId, filtered);

    // 2. Sync to Firestore or queue offline
    if (canSyncWithFirestore(userId)) {
      try {
        const docRef = doc(db, `users/${userId}/ai_actions`, actionId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Firestore deleteAction error, enqueuing offline delete:', err);
        MutationQueue.enqueue(userId, 'ai_actions', 'delete', actionId);
      }
    } else {
      MutationQueue.enqueue(userId, 'ai_actions', 'delete', actionId);
    }
  }

  static subscribeAiActions(
    userId: string,
    callback: (actions: AiActionConfig[]) => void
  ): () => void {
    callback(this.getLocalActions(userId));

    if (!canSyncWithFirestore(userId)) {
      return () => {};
    }

    try {
      const colRef = collection(db, `users/${userId}/ai_actions`);
      return onSnapshot(
        colRef,
        (snapshot) => {
          const list: AiActionConfig[] = [];
          snapshot.forEach((d) => {
            try {
              list.push(AiActionConfigSchema.parse(d.data()));
            } catch {
              // skip
            }
          });
          if (list.length > 0) {
            this.saveLocalActions(userId, list);
            callback(list);
          }
        },
        (err) => {
          console.warn('AI actions subscription error:', err);
        }
      );
    } catch {
      return () => {};
    }
  }
}
