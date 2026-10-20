import { getDayOfWeek } from '@/lib/time-utils';
import { db, canSyncWithFirestore, cleanForFirestore } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface HolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
  isCustom?: boolean;
}

const HOLIDAYS_STORAGE_PREFIX = 'my_routine_holidays_';

// Common statutory/gazetted holidays as default presets
export const DEFAULT_HOLIDAY_PRESETS: { monthDay: string; name: string }[] = [
  { monthDay: '01-01', name: "New Year's Day" },
  { monthDay: '01-26', name: 'Republic Day' },
  { monthDay: '05-01', name: 'Labor Day' },
  { monthDay: '08-15', name: 'Independence Day' },
  { monthDay: '10-02', name: 'Gandhi Jayanti' },
  { monthDay: '12-25', name: 'Christmas Day' },
  { monthDay: '12-31', name: "New Year's Eve" },
];

export class HolidayService {
  private static getStorageKey(userId: string): string {
    return `${HOLIDAYS_STORAGE_PREFIX}${userId}`;
  }

  /**
   * Returns true if the given YYYY-MM-DD date falls on a weekend (Saturday or Sunday).
   */
  static isWeekend(dateStr: string): boolean {
    const dow = getDayOfWeek(dateStr);
    return dow === 0 || dow === 6; // 0 = Sunday, 6 = Saturday
  }

  /**
   * Retrieves all saved holidays for a user from local storage.
   */
  static getHolidays(userId: string): HolidayItem[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.getStorageKey(userId));
    if (!raw) {
      // Seed default preset holidays for the current year
      const currentYear = new Date().getFullYear();
      const defaultList: HolidayItem[] = DEFAULT_HOLIDAY_PRESETS.map((p) => ({
        date: `${currentYear}-${p.monthDay}`,
        name: p.name,
        isCustom: false,
      }));
      this.saveHolidays(userId, defaultList);
      return defaultList;
    }
    try {
      return JSON.parse(raw) as HolidayItem[];
    } catch {
      return [];
    }
  }

  /**
   * Saves holidays to local storage and syncs to Firestore if connected.
   */
  static saveHolidays(userId: string, holidays: HolidayItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getStorageKey(userId), JSON.stringify(holidays));

    if (canSyncWithFirestore(userId)) {
      setDoc(
        doc(db, `users/${userId}/settings`, 'holidays'),
        cleanForFirestore({ holidays, updatedAt: Date.now() })
      ).catch((err) => {
        console.warn('Failed to sync holidays to Firestore:', err);
      });
    }
  }

  /**
   * Checks if a specific date is registered as a holiday for the user.
   */
  static getHolidayForDate(userId: string, dateStr: string): HolidayItem | undefined {
    const holidays = this.getHolidays(userId);
    return holidays.find((h) => h.date === dateStr);
  }

  /**
   * Adds or updates a holiday.
   */
  static addHoliday(userId: string, holiday: { date: string; name: string; isCustom?: boolean }): void {
    const holidays = this.getHolidays(userId);
    const existingIndex = holidays.findIndex((h) => h.date === holiday.date);
    const newItem: HolidayItem = {
      date: holiday.date,
      name: holiday.name.trim() || 'Holiday',
      isCustom: holiday.isCustom ?? true,
    };

    if (existingIndex >= 0) {
      holidays[existingIndex] = newItem;
    } else {
      holidays.push(newItem);
    }

    this.saveHolidays(userId, holidays);
  }

  /**
   * Removes a holiday by date.
   */
  static removeHoliday(userId: string, dateStr: string): void {
    const holidays = this.getHolidays(userId);
    const filtered = holidays.filter((h) => h.date !== dateStr);
    this.saveHolidays(userId, filtered);
  }

  /**
   * Returns complete day off info: whether it's weekend, holiday, and display labels.
   */
  static getDayTypeInfo(
    userId: string,
    dateStr: string
  ): {
    isDayOff: boolean;
    isWeekend: boolean;
    isHoliday: boolean;
    holidayName?: string;
    label: string;
  } {
    const weekend = this.isWeekend(dateStr);
    const holiday = this.getHolidayForDate(userId, dateStr);
    const isHoliday = Boolean(holiday);
    const isDayOff = weekend || isHoliday;

    let label = 'Regular Day';
    if (weekend && isHoliday) {
      label = `Weekend & ${holiday?.name}`;
    } else if (isHoliday) {
      label = `Holiday: ${holiday?.name}`;
    } else if (weekend) {
      const dow = getDayOfWeek(dateStr);
      label = dow === 0 ? 'Sunday Weekend' : 'Saturday Weekend';
    }

    return {
      isDayOff,
      isWeekend: weekend,
      isHoliday,
      holidayName: holiday?.name,
      label,
    };
  }
}
