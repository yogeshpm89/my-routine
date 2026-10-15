import { ActivityLog, ActivityStatus } from '@/types/routine';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'my_routine_logs_';

export class LogRepository {
  private static getLocalKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  static getLocalLogs(userId: string): ActivityLog[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.getLocalKey(userId));
    if (!raw) return [];
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

  static async getLogsForDate(userId: string, date: string): Promise<ActivityLog[]> {
    const local = this.getLocalLogs(userId).filter((l) => l.date === date);

    if (isFirebaseConfigured && db && typeof navigator !== 'undefined' && navigator.onLine) {
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

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, `users/${log.userId}/logs`, log.id), itemToSave);
      } catch (err) {
        console.warn('Failed to save log to Firestore:', err);
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
      updatedAt: Date.now(),
    };

    await this.saveLog(updatedLog);
    return updatedLog;
  }
}
