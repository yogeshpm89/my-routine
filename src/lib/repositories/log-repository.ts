import { ActivityLog, ActivityStatus } from '@/types/routine';
import { db, canSyncWithFirestore, cleanForFirestore } from '@/lib/firebase/config';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { SyncEngine } from '@/lib/sync/sync-engine';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'my_routine_logs_';

export class LogRepository {
  private static getLocalKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  static getLocalLogs(userId: string): ActivityLog[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.getLocalKey(userId));
    if (!raw) {
      const guestRaw = userId !== 'local-default-user' ? localStorage.getItem(this.getLocalKey('local-default-user')) : null;
      if (guestRaw) {
        try {
          const guestLogs = (JSON.parse(guestRaw) as ActivityLog[]).map((l) => ({ ...l, userId }));
          this.saveLocalLogs(userId, guestLogs);
          return guestLogs;
        } catch {
          // ignore fallback
        }
      }
      return [];
    }
    try {
      return JSON.parse(raw) as ActivityLog[];
    } catch {
      return [];
    }
  }

  static saveLocalLogs(userId: string, logs: ActivityLog[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getLocalKey(userId), JSON.stringify(logs));
  }

  static subscribeLogs(
    userId: string,
    onData: (logs: ActivityLog[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const local = this.getLocalLogs(userId);
    onData(local);

    if (!canSyncWithFirestore(userId)) {
      return () => {};
    }

    try {
      const colRef = collection(db, `users/${userId}/logs`);
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const remote: ActivityLog[] = [];
          snapshot.forEach((d) => remote.push(d.data() as ActivityLog));

          const localLogs = this.getLocalLogs(userId);
          const pendingIds = new Set(
            MutationQueue.getQueue(userId)
              .filter((m) => m.collection === 'logs')
              .map((m) => m.docId)
          );

          const mergedMap = new Map<string, ActivityLog>();
          remote.forEach((l) => mergedMap.set(l.id, l));

          localLogs.forEach((l) => {
            const remoteItem = mergedMap.get(l.id);
            if (pendingIds.has(l.id) || !remoteItem || (l.updatedAt || 0) > (remoteItem.updatedAt || 0)) {
              mergedMap.set(l.id, l);
            }
          });

          const merged = Array.from(mergedMap.values());
          this.saveLocalLogs(userId, merged);
          onData(merged);

          // If remote was empty but local has logs, seed them to Firestore in realtime
          if (remote.length === 0 && localLogs.length > 0) {
            localLogs.forEach((l) => {
              setDoc(doc(db, `users/${userId}/logs`, l.id), cleanForFirestore(l)).catch(console.warn);
            });
          }
        },
        (err) => {
          console.warn('Realtime log listener error:', err);
          if (onError) onError(err);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Failed to attach realtime log listener:', err);
      if (onError) onError(err);
      return () => {};
    }
  }

  static async getLogsForDate(userId: string, date: string): Promise<ActivityLog[]> {
    const local = this.getLocalLogs(userId).filter((l) => l.date === date);

    if (canSyncWithFirestore(userId)) {
      try {
        const logsCol = collection(db, `users/${userId}/logs`);
        const snapshot = await getDocs(query(logsCol, where('date', '==', date)));
        if (!snapshot.empty) {
          const remote: ActivityLog[] = [];
          snapshot.forEach((d) => remote.push(d.data() as ActivityLog));
          const other = this.getLocalLogs(userId).filter((l) => l.date !== date);
          this.saveLocalLogs(userId, [...other, ...remote]);
          return remote;
        }
      } catch (err) {
        console.warn('Failed to fetch logs from Firestore:', err);
      }
    }

    return local;
  }

  static async saveLog(log: ActivityLog): Promise<void> {
    const all = this.getLocalLogs(log.userId);
    const index = all.findIndex((l) => l.id === log.id);
    const updated = [...all];
    const now = Date.now();
    const itemToSave = { ...log, updatedAt: now };

    if (index >= 0) {
      updated[index] = itemToSave;
    } else {
      updated.push(itemToSave);
    }
    this.saveLocalLogs(log.userId, updated);

    MutationQueue.enqueue(log.userId, 'logs', 'set', log.id, itemToSave);

    if (canSyncWithFirestore(log.userId)) {
      try {
        const cleaned = cleanForFirestore(itemToSave);
        await setDoc(doc(db, `users/${log.userId}/logs`, log.id), cleaned);
        const q = MutationQueue.getQueue(log.userId);
        const m = q.find((item) => item.collection === 'logs' && item.docId === log.id);
        if (m) MutationQueue.dequeue(log.userId, m.id);
        SyncEngine.notifyListeners(log.userId);
      } catch (err) {
        console.warn('Failed to save log to Firestore, queued locally:', err);
      }
    }
  }

  static async updateStatus(
    userId: string,
    date: string,
    templateId: string,
    status: ActivityStatus,
    extra?: Partial<ActivityLog>
  ): Promise<ActivityLog> {
    const logId = `${date}_${templateId}`;
    const all = this.getLocalLogs(userId);
    const existing = all.find((l) => l.id === logId);

    const updatedLog: ActivityLog = {
      id: logId,
      userId,
      templateId,
      date,
      status,
      actualStartTime: extra?.actualStartTime ?? existing?.actualStartTime,
      actualEndTime: extra?.actualEndTime ?? existing?.actualEndTime,
      actualDurationMinutes: extra?.actualDurationMinutes ?? existing?.actualDurationMinutes ?? 0,
      targetDurationMinutes: extra?.targetDurationMinutes ?? existing?.targetDurationMinutes ?? 0,
      completionNotes: extra?.completionNotes ?? existing?.completionNotes ?? '',
      completedStepIds: extra?.completedStepIds ?? existing?.completedStepIds ?? [],
      updatedAt: Date.now(),
    };

    await this.saveLog(updatedLog);
    return updatedLog;
  }

  static async toggleStep(
    userId: string,
    date: string,
    templateId: string,
    stepId: string
  ): Promise<ActivityLog> {
    const logId = `${date}_${templateId}`;
    const all = this.getLocalLogs(userId);
    const existing = all.find((l) => l.id === logId);

    const currentCompleted = existing?.completedStepIds || [];
    const nextCompleted = currentCompleted.includes(stepId)
      ? currentCompleted.filter((id) => id !== stepId)
      : [...currentCompleted, stepId];

    const currentStatus = existing?.status ?? 'pending';
    const newStatus = currentStatus === 'pending' ? 'in_progress' : currentStatus;

    const updatedLog: ActivityLog = {
      id: logId,
      userId,
      templateId,
      date,
      status: newStatus,
      actualStartTime: existing?.actualStartTime,
      actualEndTime: existing?.actualEndTime,
      actualDurationMinutes: existing?.actualDurationMinutes ?? 0,
      targetDurationMinutes: existing?.targetDurationMinutes ?? 0,
      completionNotes: existing?.completionNotes ?? '',
      completedStepIds: nextCompleted,
      updatedAt: Date.now(),
    };

    await this.saveLog(updatedLog);
    return updatedLog;
  }
}
