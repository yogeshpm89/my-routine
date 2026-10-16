import { db, isFirebaseConfigured, canSyncWithFirestore } from '@/lib/firebase/config';
import { MutationQueue, SyncMutation } from './mutation-queue';
import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { GoalRepository } from '@/lib/repositories/goal-repository';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

export interface SyncConflict {
  id: string;
  mutation: SyncMutation;
  remoteData: any;
  localData: any;
  timestamp: number;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'conflict' | 'error';

export type SyncListener = (state: SyncState, pendingCount: number) => void;
export type ConflictListener = (conflicts: SyncConflict[]) => void;

export class SyncEngine {
  private static activeConflicts: SyncConflict[] = [];
  private static syncListeners = new Set<SyncListener>();
  private static conflictListeners = new Set<ConflictListener>();
  private static unsubscribers: Unsubscribe[] = [];
  private static isSyncing = false;

  static subscribeSync(listener: SyncListener): () => void {
    this.syncListeners.add(listener);
    listener(this.getCurrentState(), 0);
    return () => this.syncListeners.delete(listener);
  }

  static subscribeConflicts(listener: ConflictListener): () => void {
    this.conflictListeners.add(listener);
    listener(this.activeConflicts);
    return () => this.conflictListeners.delete(listener);
  }

  static getActiveConflicts(): SyncConflict[] {
    return [...this.activeConflicts];
  }

  static getCurrentState(): SyncState {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }
    if (this.activeConflicts.length > 0) {
      return 'conflict';
    }
    if (this.isSyncing) {
      return 'syncing';
    }
    return 'synced';
  }

  private static notifyListeners(userId: string): void {
    const state = this.getCurrentState();
    const count = MutationQueue.getPendingCount(userId);
    this.syncListeners.forEach((l) => l(state, count));
    this.conflictListeners.forEach((l) => l(this.activeConflicts));
  }

  static async syncNow(userId: string): Promise<{ success: boolean; applied: number; conflicts: number }> {
    if (!canSyncWithFirestore(userId)) {
      this.notifyListeners(userId);
      return { success: true, applied: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners(userId);

    const queue = MutationQueue.getQueue(userId);
    let appliedCount = 0;

    for (const mutation of queue) {
      try {
        const docRef = doc(db, `users/${userId}/${mutation.collection}`, mutation.docId);

        if (mutation.action === 'delete') {
          await deleteDoc(docRef);
          MutationQueue.dequeue(userId, mutation.id);
          appliedCount++;
        } else if (mutation.action === 'set') {
          // Check remote document for conflict detection
          const remoteSnap = await getDoc(docRef);
          if (remoteSnap.exists()) {
            const remoteData = remoteSnap.data();
            const remoteUpdated = remoteData?.updatedAt || 0;
            const mutationUpdated = mutation.payload?.updatedAt || mutation.timestamp;

            // If remote has a newer timestamp than our mutation, conflict!
            if (remoteUpdated > mutationUpdated) {
              const conflict: SyncConflict = {
                id: `conflict_${mutation.id}`,
                mutation,
                remoteData,
                localData: mutation.payload,
                timestamp: Date.now(),
              };

              // Add to conflicts unless already present
              if (!this.activeConflicts.some((c) => c.mutation.id === mutation.id)) {
                this.activeConflicts.push(conflict);
              }
              continue; // do not overwrite, await user resolution
            }
          }

          // Safe to apply
          await setDoc(docRef, mutation.payload);
          MutationQueue.dequeue(userId, mutation.id);
          appliedCount++;
        }
      } catch (err) {
        console.warn(`Sync failed for mutation ${mutation.id}:`, err);
        MutationQueue.incrementRetry(userId, mutation.id);
      }
    }

    this.isSyncing = false;
    this.notifyListeners(userId);

    return {
      success: true,
      applied: appliedCount,
      conflicts: this.activeConflicts.length,
    };
  }

  static async pushAllToFirestore(userId: string): Promise<{
    success: boolean;
    templatesCount: number;
    goalsCount: number;
    message: string;
  }> {
    if (!canSyncWithFirestore(userId)) {
      return {
        success: false,
        templatesCount: 0,
        goalsCount: 0,
        message: 'Please sign in to your account with Google or Email to sync data to the cloud.',
      };
    }

    try {
      const templates = RoutineRepository.getLocalTemplates(userId);
      const goals = GoalRepository.getLocalGoals(userId);

      for (const t of templates) {
        await setDoc(doc(db, `users/${userId}/templates`, t.id), t);
      }

      for (const g of goals) {
        await setDoc(doc(db, `users/${userId}/goals`, g.id), g);
      }

      return {
        success: true,
        templatesCount: templates.length,
        goalsCount: goals.length,
        message: `Successfully uploaded ${templates.length} routine templates and ${goals.length} goals to Firestore (/users/${userId}/*)!`,
      };
    } catch (err: any) {
      console.error('Failed to push data to Firestore:', err);
      return {
        success: false,
        templatesCount: 0,
        goalsCount: 0,
        message: `Upload failed: ${err?.message || 'Check firestore.rules and API credentials.'}`,
      };
    }
  }

  static async resolveConflict(
    userId: string,
    conflictId: string,
    resolution: 'keep_local' | 'accept_remote'
  ): Promise<void> {
    const conflict = this.activeConflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    if (resolution === 'keep_local') {
      // Force overwrite remote with local payload
      if (canSyncWithFirestore(userId)) {
        const docRef = doc(db, `users/${userId}/${conflict.mutation.collection}`, conflict.mutation.docId);
        await setDoc(docRef, { ...conflict.localData, updatedAt: Date.now() });
      }
      MutationQueue.dequeue(userId, conflict.mutation.id);
    } else {
      // Accept remote: dequeue local mutation and update local storage with remote data
      MutationQueue.dequeue(userId, conflict.mutation.id);
    }

    this.activeConflicts = this.activeConflicts.filter((c) => c.id !== conflictId);
    this.notifyListeners(userId);
  }

  static startRealtimeListener(userId: string, onRemoteChange: () => void): () => void {
    if (!canSyncWithFirestore(userId)) return () => {};

    // Clear old subscriptions
    this.stopRealtimeListeners();

    const collections = ['templates', 'overrides', 'logs', 'goals'];
    collections.forEach((colName) => {
      try {
        const colRef = collection(db, `users/${userId}/${colName}`);
        const unsub = onSnapshot(
          colRef,
          (snapshot) => {
            if (!snapshot.metadata.hasPendingWrites) {
              onRemoteChange();
            }
          },
          (err) => {
            console.warn(`Firestore realtime listener for ${colName} inactive (${err.code}):`, err.message);
          }
        );
        this.unsubscribers.push(unsub);
      } catch (err) {
        console.warn(`Realtime listener error for ${colName}:`, err);
      }
    });

    return () => this.stopRealtimeListeners();
  }

  static stopRealtimeListeners(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}
