import { GoalProgressEntry } from '@/types/goal-progress';
import { db, canSyncWithFirestore, cleanForFirestore } from '@/lib/firebase/config';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { SyncEngine } from '@/lib/sync/sync-engine';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'my_routine_goal_progress_';

export class GoalProgressRepository {
  private static getLocalKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  static getLocalEntries(userId: string): GoalProgressEntry[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.getLocalKey(userId));
    if (!raw) {
      const guestRaw =
        userId !== 'local-default-user'
          ? localStorage.getItem(this.getLocalKey('local-default-user'))
          : null;
      if (guestRaw) {
        try {
          const guestEntries = (JSON.parse(guestRaw) as GoalProgressEntry[]).map(
            (e) => ({ ...e, userId })
          );
          this.saveLocalEntries(userId, guestEntries);
          return guestEntries;
        } catch {
          // ignore parsing error
        }
      }
      return [];
    }
    try {
      return JSON.parse(raw) as GoalProgressEntry[];
    } catch {
      return [];
    }
  }

  static saveLocalEntries(userId: string, entries: GoalProgressEntry[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getLocalKey(userId), JSON.stringify(entries));
  }

  static getLocalProgress(userId: string): GoalProgressEntry[] {
    return this.getLocalEntries(userId);
  }

  static async getProgressEntries(userId: string): Promise<GoalProgressEntry[]> {
    return this.getLocalEntries(userId);
  }

  static getEntriesForDate(userId: string, date: string): GoalProgressEntry[] {
    return this.getLocalEntries(userId).filter((e) => e.date === date);
  }

  static getEntriesForGoal(
    userId: string,
    goalId: string,
    date?: string
  ): GoalProgressEntry[] {
    return this.getLocalEntries(userId).filter(
      (e) => e.goalId === goalId && (!date || e.date === date)
    );
  }

  static async addEntry(
    entry: Partial<GoalProgressEntry> & {
      userId: string;
      goalId: string;
      date: string;
    }
  ): Promise<GoalProgressEntry> {
    const all = this.getLocalEntries(entry.userId);
    const now = Date.now();
    const minutes = entry.minutes ?? entry.durationMinutes ?? 0;
    const amount = entry.amount ?? entry.unitValue ?? (entry.unit === 'minutes' ? minutes : 1);
    const note = entry.note ?? entry.notes ?? '';

    const entryToSave: GoalProgressEntry = {
      id: entry.id || `gp_${now}_${Math.random().toString(36).substring(2, 9)}`,
      userId: entry.userId,
      goalId: entry.goalId,
      date: entry.date,
      minutes,
      durationMinutes: minutes,
      amount,
      unitValue: amount,
      unit: entry.unit || 'minutes',
      source: entry.source || 'manual',
      routineLogId: entry.routineLogId,
      note,
      notes: note,
      createdAt: entry.createdAt || now,
      updatedAt: now,
    };

    const updated = [entryToSave, ...all];
    this.saveLocalEntries(entry.userId, updated);

    MutationQueue.enqueue(
      entry.userId,
      'goal_progress',
      'set',
      entryToSave.id,
      entryToSave
    );

    if (canSyncWithFirestore(entry.userId)) {
      try {
        const cleaned = cleanForFirestore(entryToSave);
        await setDoc(
          doc(db, `users/${entry.userId}/goal_progress`, entryToSave.id),
          cleaned
        );
        const q = MutationQueue.getQueue(entry.userId);
        const m = q.find(
          (item) => item.collection === 'goal_progress' && item.docId === entryToSave.id
        );
        if (m) MutationQueue.dequeue(entry.userId, m.id);
        SyncEngine.notifyListeners(entry.userId);
      } catch (err) {
        console.warn('Failed to save goal progress to Firestore, queued locally:', err);
      }
    }

    return entryToSave;
  }

  static async deleteEntry(userId: string, entryId: string): Promise<void> {
    const all = this.getLocalEntries(userId);
    const filtered = all.filter((e) => e.id !== entryId);
    this.saveLocalEntries(userId, filtered);

    MutationQueue.enqueue(userId, 'goal_progress', 'delete', entryId);

    if (canSyncWithFirestore(userId)) {
      try {
        await deleteDoc(doc(db, `users/${userId}/goal_progress`, entryId));
        const q = MutationQueue.getQueue(userId);
        const m = q.find(
          (item) => item.collection === 'goal_progress' && item.docId === entryId
        );
        if (m) MutationQueue.dequeue(userId, m.id);
        SyncEngine.notifyListeners(userId);
      } catch (err) {
        console.warn('Failed to delete goal progress from Firestore, queued locally:', err);
      }
    }
  }

  /**
   * Undoes/deletes the most recent progress entry for a goal on a given date.
   */
  static async undoLastEntry(
    userId: string,
    goalId: string,
    date: string
  ): Promise<GoalProgressEntry | null> {
    const all = this.getLocalEntries(userId);
    // Find matching entries sorted newest first
    const matching = all
      .filter((e) => e.goalId === goalId && e.date === date)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (matching.length === 0) return null;

    const toRemove = matching[0];
    await this.deleteEntry(userId, toRemove.id);
    return toRemove;
  }

  static subscribeProgress(
    userId: string,
    onData: (entries: GoalProgressEntry[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const local = this.getLocalEntries(userId);
    onData(local);

    if (!canSyncWithFirestore(userId)) {
      return () => {};
    }

    try {
      const colRef = collection(db, `users/${userId}/goal_progress`);
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const remote: GoalProgressEntry[] = [];
            snapshot.forEach((d) => {
              remote.push(d.data() as GoalProgressEntry);
            });
            // Merge remote with local ensuring no duplicate IDs
            const remoteIds = new Set(remote.map((r) => r.id));
            const merged = [...remote];
            for (const l of local) {
              if (!remoteIds.has(l.id)) {
                merged.push(l);
              }
            }
            this.saveLocalEntries(userId, merged);
            onData(merged);
          } else if (local.length > 0) {
            for (const e of local) {
              const cleaned = cleanForFirestore(e);
              setDoc(doc(db, `users/${userId}/goal_progress`, e.id), cleaned).catch(
                console.warn
              );
            }
          } else {
            this.saveLocalEntries(userId, []);
            onData([]);
          }
        },
        (err) => {
          console.warn('Realtime goal progress listener error:', err);
          if (onError) onError(err);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Failed to attach realtime goal progress listener:', err);
      if (onError) onError(err);
      return () => {};
    }
  }
}
