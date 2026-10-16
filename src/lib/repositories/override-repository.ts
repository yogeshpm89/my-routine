import { OccurrenceOverride } from '@/types/routine';
import { db, canSyncWithFirestore } from '@/lib/firebase/config';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'my_routine_overrides_';

export class OverrideRepository {
  private static getLocalKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  static getLocalOverrides(userId: string): OccurrenceOverride[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.getLocalKey(userId));
    if (!raw) {
      const guestRaw = userId !== 'local-default-user' ? localStorage.getItem(this.getLocalKey('local-default-user')) : null;
      if (guestRaw) {
        try {
          const guestOverrides = (JSON.parse(guestRaw) as OccurrenceOverride[]).map((o) => ({ ...o, userId }));
          this.saveLocalOverrides(userId, guestOverrides);
          return guestOverrides;
        } catch {
          // ignore fallback
        }
      }
      return [];
    }
    try {
      return JSON.parse(raw) as OccurrenceOverride[];
    } catch {
      return [];
    }
  }

  static saveLocalOverrides(userId: string, overrides: OccurrenceOverride[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getLocalKey(userId), JSON.stringify(overrides));
  }

  static async getOverridesForDate(userId: string, date: string): Promise<OccurrenceOverride[]> {
    const local = this.getLocalOverrides(userId).filter((o) => o.date === date);

    if (canSyncWithFirestore(userId)) {
      try {
        const overridesCol = collection(db, `users/${userId}/overrides`);
        const snapshot = await getDocs(query(overridesCol, where('date', '==', date)));
        if (!snapshot.empty) {
          const remote: OccurrenceOverride[] = [];
          snapshot.forEach((d) => remote.push(d.data() as OccurrenceOverride));
          // Merge with local
          const all = this.getLocalOverrides(userId).filter((o) => o.date !== date);
          this.saveLocalOverrides(userId, [...all, ...remote]);
          return remote;
        }
      } catch (err) {
        console.warn('Failed to fetch overrides from Firestore:', err);
      }
    }

    return local;
  }

  static async saveOverride(override: OccurrenceOverride): Promise<void> {
    const all = this.getLocalOverrides(override.userId);
    const index = all.findIndex((o) => o.id === override.id);
    const updated = [...all];
    const now = Date.now();
    const itemToSave = { ...override, updatedAt: now };

    if (index >= 0) {
      updated[index] = itemToSave;
    } else {
      updated.push(itemToSave);
    }
    this.saveLocalOverrides(override.userId, updated);

    MutationQueue.enqueue(override.userId, 'overrides', 'set', override.id, itemToSave);

    if (canSyncWithFirestore(override.userId)) {
      try {
        await setDoc(doc(db, `users/${override.userId}/overrides`, override.id), itemToSave);
        const q = MutationQueue.getQueue(override.userId);
        const m = q.find((item) => item.collection === 'overrides' && item.docId === override.id);
        if (m) MutationQueue.dequeue(override.userId, m.id);
      } catch (err) {
        console.warn('Failed to save override to Firestore, queued locally:', err);
      }
    }
  }

  static async deleteOverride(userId: string, overrideId: string): Promise<void> {
    const all = this.getLocalOverrides(userId);
    const filtered = all.filter((o) => o.id !== overrideId);
    this.saveLocalOverrides(userId, filtered);

    MutationQueue.enqueue(userId, 'overrides', 'delete', overrideId);

    if (canSyncWithFirestore(userId)) {
      try {
        await deleteDoc(doc(db, `users/${userId}/overrides`, overrideId));
        const q = MutationQueue.getQueue(userId);
        const m = q.find((item) => item.collection === 'overrides' && item.docId === overrideId);
        if (m) MutationQueue.dequeue(userId, m.id);
      } catch (err) {
        console.warn('Failed to delete override from Firestore, queued locally:', err);
      }
    }
  }
}
