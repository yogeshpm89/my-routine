import { GoalTarget } from '@/types/routine';
import { getInitialGoalTargets } from '@/lib/seed-data';
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

  static async getGoals(userId: string): Promise<GoalTarget[]> {
    const local = this.getLocalGoals(userId);

    if (isFirebaseConfigured && db && typeof navigator !== 'undefined' && navigator.onLine) {
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

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, `users/${goal.userId}/goals`, goal.id), itemToSave);
      } catch (err) {
        console.warn('Failed to save goal to Firestore:', err);
      }
    }
  }

  static async deleteGoal(userId: string, goalId: string): Promise<void> {
    const all = this.getLocalGoals(userId);
    const filtered = all.filter((g) => g.id !== goalId);
    this.saveLocalGoals(userId, filtered);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, `users/${userId}/goals`, goalId));
      } catch (err) {
        console.warn('Failed to delete goal from Firestore:', err);
      }
    }
  }
}
