import { GoalTarget } from '@/types/routine';
import { getInitialGoalTargets } from '@/lib/seed-data';
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
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'my_routine_goals_';

export class GoalRepository {
  private static getLocalKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  static getLocalGoals(userId: string): GoalTarget[] {
    if (typeof window === 'undefined') {
      return getInitialGoalTargets(userId);
    }
    const raw = localStorage.getItem(this.getLocalKey(userId));
    if (!raw) {
      const guestRaw = userId !== 'local-default-user' ? localStorage.getItem(this.getLocalKey('local-default-user')) : null;
      if (guestRaw) {
        try {
          const guestGoals = (JSON.parse(guestRaw) as GoalTarget[]).map((g) => ({ ...g, userId }));
          this.saveLocalGoals(userId, guestGoals);
          return guestGoals;
        } catch {
          // ignore fallback
        }
      }
      const initial = getInitialGoalTargets(userId);
      this.saveLocalGoals(userId, initial);
      return initial;
    }
    try {
      return JSON.parse(raw) as GoalTarget[];
    } catch {
      return getInitialGoalTargets(userId);
    }
  }

  static saveLocalGoals(userId: string, goals: GoalTarget[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getLocalKey(userId), JSON.stringify(goals));
  }

  static subscribeGoals(
    userId: string,
    onData: (goals: GoalTarget[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const local = this.getLocalGoals(userId);
    onData(local);

    if (!canSyncWithFirestore(userId)) {
      return () => {};
    }

    try {
      const colRef = collection(db, `users/${userId}/goals`);
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const remote: GoalTarget[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as GoalTarget;
              if (!data.isArchived) {
                remote.push(data);
              }
            });
            this.saveLocalGoals(userId, remote);
            onData(remote);
          } else if (local.length > 0) {
            for (const g of local) {
              setDoc(doc(db, `users/${userId}/goals`, g.id), g).catch(console.warn);
            }
          } else {
            this.saveLocalGoals(userId, []);
            onData([]);
          }
        },
        (err) => {
          console.warn('Realtime goal listener error:', err);
          if (onError) onError(err);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Failed to attach realtime goal listener:', err);
      if (onError) onError(err);
      return () => {};
    }
  }

  static async getGoals(userId: string): Promise<GoalTarget[]> {
    const local = this.getLocalGoals(userId);

    if (canSyncWithFirestore(userId)) {
      try {
        const goalsCol = collection(db, `users/${userId}/goals`);
        const snapshot = await getDocs(query(goalsCol, where('isArchived', '==', false)));
        if (!snapshot.empty) {
          const remote: GoalTarget[] = [];
          snapshot.forEach((d) => remote.push(d.data() as GoalTarget));
          this.saveLocalGoals(userId, remote);
          return remote;
        } else if (local.length > 0) {
          for (const g of local) {
            await setDoc(doc(db, `users/${userId}/goals`, g.id), g);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch goals from Firestore:', err);
      }
    }

    return local;
  }

  static async saveGoal(goal: GoalTarget): Promise<void> {
    const all = this.getLocalGoals(goal.userId);
    const index = all.findIndex((g) => g.id === goal.id);
    const updated = [...all];
    const now = Date.now();
    const itemToSave = { ...goal, updatedAt: now };

    if (index >= 0) {
      updated[index] = itemToSave;
    } else {
      updated.push(itemToSave);
    }
    this.saveLocalGoals(goal.userId, updated);

    MutationQueue.enqueue(goal.userId, 'goals', 'set', goal.id, itemToSave);

    if (canSyncWithFirestore(goal.userId)) {
      try {
        await setDoc(doc(db, `users/${goal.userId}/goals`, goal.id), itemToSave);
        const q = MutationQueue.getQueue(goal.userId);
        const m = q.find((item) => item.collection === 'goals' && item.docId === goal.id);
        if (m) MutationQueue.dequeue(goal.userId, m.id);
      } catch (err) {
        console.warn('Failed to save goal to Firestore, queued locally:', err);
      }
    }
  }

  static async deleteGoal(userId: string, goalId: string): Promise<void> {
    const all = this.getLocalGoals(userId);
    const filtered = all.filter((g) => g.id !== goalId);
    this.saveLocalGoals(userId, filtered);

    MutationQueue.enqueue(userId, 'goals', 'delete', goalId);

    if (canSyncWithFirestore(userId)) {
      try {
        await deleteDoc(doc(db, `users/${userId}/goals`, goalId));
        const q = MutationQueue.getQueue(userId);
        const m = q.find((item) => item.collection === 'goals' && item.docId === goalId);
        if (m) MutationQueue.dequeue(userId, m.id);
      } catch (err) {
        console.warn('Failed to delete goal from Firestore, queued locally:', err);
      }
    }
  }
}
