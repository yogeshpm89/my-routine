export type SyncCollection =
  | 'templates'
  | 'overrides'
  | 'logs'
  | 'goals'
  | 'settings'
  | 'ai_actions'
  | 'ai_executions'
  | 'life_goals'
  | 'day_templates'
  | 'weekly_planner';
export type SyncAction = 'set' | 'delete';

export interface SyncMutation {
  id: string;
  userId: string;
  timestamp: number;
  collection: SyncCollection;
  action: SyncAction;
  docId: string;
  payload?: any;
  retryCount: number;
}

const MUTATION_QUEUE_KEY_PREFIX = 'my_routine_mutation_queue_';

export class MutationQueue {
  private static getKey(userId: string): string {
    return `${MUTATION_QUEUE_KEY_PREFIX}${userId}`;
  }

  static getQueue(userId: string): SyncMutation[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.getKey(userId));
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SyncMutation[];
    } catch {
      return [];
    }
  }

  static saveQueue(userId: string, queue: SyncMutation[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getKey(userId), JSON.stringify(queue));
  }

  static enqueue(
    userId: string,
    collection: SyncCollection,
    action: SyncAction,
    docId: string,
    payload?: any
  ): SyncMutation {
    const queue = this.getQueue(userId);
    const mutation: SyncMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      timestamp: Date.now(),
      collection,
      action,
      docId,
      payload,
      retryCount: 0,
    };

    // Deduplicate: if an uncommitted mutation for the same collection and docId exists, replace it
    const filtered = queue.filter(
      (m) => !(m.collection === collection && m.docId === docId)
    );
    filtered.push(mutation);
    this.saveQueue(userId, filtered);
    return mutation;
  }

  static dequeue(userId: string, mutationId: string): void {
    const queue = this.getQueue(userId);
    const updated = queue.filter((m) => m.id !== mutationId);
    this.saveQueue(userId, updated);
  }

  static incrementRetry(userId: string, mutationId: string): void {
    const queue = this.getQueue(userId);
    const target = queue.find((m) => m.id === mutationId);
    if (target) {
      target.retryCount += 1;
      this.saveQueue(userId, queue);
    }
  }

  static clear(userId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.getKey(userId));
  }

  static getPendingCount(userId: string): number {
    return this.getQueue(userId).length;
  }
}
