import {
  AiExecution,
  AiExecutionSchema,
  AiResult,
  AiResultSchema,
} from '@/types/ai';
import { db, canSyncWithFirestore } from '@/lib/firebase/config';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

const EXECUTIONS_KEY_PREFIX = 'my_routine_ai_executions_';
const RESULTS_KEY_PREFIX = 'my_routine_ai_results_';

export class AiExecutionRepository {
  private static getExecutionsKey(userId: string): string {
    return `${EXECUTIONS_KEY_PREFIX}${userId}`;
  }

  private static getResultsKey(userId: string): string {
    return `${RESULTS_KEY_PREFIX}${userId}`;
  }

  // --- Local Cache ---

  static getLocalExecutions(userId: string): AiExecution[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.getExecutionsKey(userId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as AiExecution[];
      return parsed
        .map((e) => {
          try {
            return AiExecutionSchema.parse(e);
          } catch {
            return null;
          }
        })
        .filter((e): e is AiExecution => e !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  static saveLocalExecutions(userId: string, executions: AiExecution[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getExecutionsKey(userId), JSON.stringify(executions));
  }

  static getLocalResults(userId: string): AiResult[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.getResultsKey(userId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as AiResult[];
      return parsed
        .map((r) => {
          try {
            return AiResultSchema.parse(r);
          } catch {
            return null;
          }
        })
        .filter((r): r is AiResult => r !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  static saveLocalResults(userId: string, results: AiResult[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getResultsKey(userId), JSON.stringify(results));
  }

  // --- Execution Operations ---

  static async recordExecution(execution: AiExecution): Promise<void> {
    const validated = AiExecutionSchema.parse(execution);
    const userId = validated.userId;

    // 1. Update local cache
    const current = this.getLocalExecutions(userId);
    const idx = current.findIndex((e) => e.id === validated.id);
    if (idx >= 0) {
      current[idx] = validated;
    } else {
      current.unshift(validated);
    }
    this.saveLocalExecutions(userId, current);

    // 2. Firestore Sync
    if (canSyncWithFirestore(userId)) {
      try {
        const docRef = doc(db, `users/${userId}/ai_executions`, validated.id);
        await setDoc(docRef, validated);
      } catch (err) {
        console.warn('Failed to sync AI execution to Firestore:', err);
      }
    }
  }

  static async recordResult(result: AiResult): Promise<void> {
    const validated = AiResultSchema.parse(result);
    const userId = validated.userId;

    // 1. Update local cache
    const current = this.getLocalResults(userId);
    const idx = current.findIndex((r) => r.id === validated.id);
    if (idx >= 0) {
      current[idx] = validated;
    } else {
      current.unshift(validated);
    }
    this.saveLocalResults(userId, current);

    // 2. Firestore Sync
    if (canSyncWithFirestore(userId)) {
      try {
        const docRef = doc(db, `users/${userId}/ai_results`, validated.id);
        await setDoc(docRef, validated);
      } catch (err) {
        console.warn('Failed to sync AI result to Firestore:', err);
      }
    }
  }

  static async getExecution(userId: string, executionId: string): Promise<AiExecution | null> {
    const local = this.getLocalExecutions(userId);
    const found = local.find((e) => e.id === executionId);
    if (found) return found;

    if (canSyncWithFirestore(userId)) {
      try {
        const docRef = doc(db, `users/${userId}/ai_executions`, executionId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return AiExecutionSchema.parse(snap.data());
        }
      } catch (err) {
        console.warn('Failed to fetch AI execution from Firestore:', err);
      }
    }
    return null;
  }

  static async getResult(userId: string, resultId: string): Promise<AiResult | null> {
    const local = this.getLocalResults(userId);
    const found = local.find((r) => r.id === resultId);
    if (found) return found;

    if (canSyncWithFirestore(userId)) {
      try {
        const docRef = doc(db, `users/${userId}/ai_results`, resultId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return AiResultSchema.parse(snap.data());
        }
      } catch (err) {
        console.warn('Failed to fetch AI result from Firestore:', err);
      }
    }
    return null;
  }

  static async getExecutionsForAction(userId: string, actionId: string): Promise<AiExecution[]> {
    return this.getLocalExecutions(userId)
      .filter((e) => e.actionId === actionId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  static async getResultByExecutionId(
    userId: string,
    executionId: string
  ): Promise<AiResult | null> {
    // 1. Try local cache
    const local = this.getLocalResults(userId);
    const match = local.find((r) => r.executionId === executionId);
    if (match) return match;

    // 2. Try Firestore
    if (canSyncWithFirestore(userId)) {
      try {
        const docRef = doc(db, `users/${userId}/ai_results`, `result_${executionId}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const parsed = AiResultSchema.parse(snap.data());
          // Cache locally
          local.unshift(parsed);
          this.saveLocalResults(userId, local);
          return parsed;
        }
      } catch (err) {
        console.warn('Failed to fetch AI result from Firestore:', err);
      }
    }

    return null;
  }

  static async getHistoryForAction(
    userId: string,
    actionId: string,
    limitCount: number = 20
  ): Promise<{ execution: AiExecution; result?: AiResult }[]> {
    const executions = this.getLocalExecutions(userId).filter((e) => e.actionId === actionId);
    const results = this.getLocalResults(userId);
    const resultMap = new Map<string, AiResult>();
    results.forEach((r) => resultMap.set(r.executionId, r));

    return executions.slice(0, limitCount).map((execution) => ({
      execution,
      result: resultMap.get(execution.id),
    }));
  }

  static async getAllHistory(
    userId: string,
    limitCount: number = 30
  ): Promise<{ execution: AiExecution; result?: AiResult }[]> {
    const executions = this.getLocalExecutions(userId);
    const results = this.getLocalResults(userId);
    const resultMap = new Map<string, AiResult>();
    results.forEach((r) => resultMap.set(r.executionId, r));

    // Also fetch remote if online
    if (canSyncWithFirestore(userId)) {
      try {
        const q = query(
          collection(db, `users/${userId}/ai_executions`),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteExecs: AiExecution[] = [];
          snap.forEach((d) => {
            try {
              remoteExecs.push(AiExecutionSchema.parse(d.data()));
            } catch {
              // skip
            }
          });
          const merged = new Map<string, AiExecution>();
          executions.forEach((e) => merged.set(e.id, e));
          remoteExecs.forEach((e) => merged.set(e.id, e));
          const sorted = Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
          this.saveLocalExecutions(userId, sorted);
        }
      } catch (err) {
        console.warn('Failed to fetch remote AI executions:', err);
      }
    }

    return executions.slice(0, limitCount).map((execution) => ({
      execution,
      result: resultMap.get(execution.id),
    }));
  }

  static subscribeAiExecutions(
    userId: string,
    callback: (executions: AiExecution[]) => void
  ): () => void {
    callback(this.getLocalExecutions(userId));

    if (!canSyncWithFirestore(userId)) {
      return () => {};
    }

    try {
      const q = query(
        collection(db, `users/${userId}/ai_executions`),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      return onSnapshot(
        q,
        (snapshot) => {
          const list: AiExecution[] = [];
          snapshot.forEach((d) => {
            try {
              list.push(AiExecutionSchema.parse(d.data()));
            } catch {
              // skip
            }
          });
          if (list.length > 0) {
            this.saveLocalExecutions(userId, list);
            callback(list);
          }
        },
        (err) => {
          console.warn('AI executions subscription error:', err);
        }
      );
    } catch {
      return () => {};
    }
  }
}
