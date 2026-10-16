import { NotificationPreferences, NotificationPreferencesSchema } from '@/types/notifications';
import { db, canSyncWithFirestore } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PREFS_KEY_PREFIX = 'my_routine_notif_prefs_';

export function getDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
    snoozeDurationMinutes: 10,
    defaultAdvanceReminders: [-10],
    updatedAt: Date.now(),
  };
}

export class NotificationPreferencesRepository {
  private static getKey(userId: string): string {
    return `${PREFS_KEY_PREFIX}${userId}`;
  }

  static getLocalPreferences(userId: string): NotificationPreferences {
    if (typeof window === 'undefined') return getDefaultPreferences(userId);
    const raw = localStorage.getItem(this.getKey(userId));
    if (!raw) return getDefaultPreferences(userId);
    try {
      const parsed = JSON.parse(raw);
      return NotificationPreferencesSchema.parse(parsed);
    } catch {
      return getDefaultPreferences(userId);
    }
  }

  static saveLocalPreferences(userId: string, prefs: NotificationPreferences): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getKey(userId), JSON.stringify(prefs));
  }

  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    const local = this.getLocalPreferences(userId);

    if (canSyncWithFirestore(userId)) {
      try {
        const snap = await getDoc(doc(db, `users/${userId}/settings/notifications`));
        if (snap.exists()) {
          const remote = snap.data() as NotificationPreferences;
          this.saveLocalPreferences(userId, remote);
          return remote;
        } else {
          await setDoc(doc(db, `users/${userId}/settings/notifications`), local);
        }
      } catch (err) {
        console.warn('Failed to fetch notification preferences from Firestore:', err);
      }
    }

    return local;
  }

  static async savePreferences(prefs: NotificationPreferences): Promise<void> {
    const updated = { ...prefs, updatedAt: Date.now() };
    this.saveLocalPreferences(prefs.userId, updated);

    if (canSyncWithFirestore(prefs.userId)) {
      try {
        await setDoc(doc(db, `users/${prefs.userId}/settings/notifications`), updated);
      } catch (err) {
        console.warn('Failed to save notification preferences to Firestore:', err);
      }
    }
  }
}
