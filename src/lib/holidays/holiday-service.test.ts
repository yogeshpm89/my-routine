import { describe, it, expect, beforeEach } from 'vitest';
import { HolidayService } from './holiday-service';

describe('HolidayService', () => {
  const testUserId = 'test-holiday-user';

  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly identifies weekend dates', () => {
    // 2026-10-24 is Saturday, 2026-10-25 is Sunday
    expect(HolidayService.isWeekend('2026-10-24')).toBe(true);
    expect(HolidayService.isWeekend('2026-10-25')).toBe(true);

    // 2026-10-26 is Monday, 2026-10-23 is Friday
    expect(HolidayService.isWeekend('2026-10-26')).toBe(false);
    expect(HolidayService.isWeekend('2026-10-23')).toBe(false);
  });

  it('adds and retrieves holidays', () => {
    HolidayService.addHoliday(testUserId, {
      date: '2026-11-08',
      name: 'Diwali',
    });

    const holiday = HolidayService.getHolidayForDate(testUserId, '2026-11-08');
    expect(holiday).toBeDefined();
    expect(holiday?.name).toBe('Diwali');

    const dayInfo = HolidayService.getDayTypeInfo(testUserId, '2026-11-08');
    expect(dayInfo.isHoliday).toBe(true);
    expect(dayInfo.holidayName).toBe('Diwali');
    expect(dayInfo.isDayOff).toBe(true);
  });

  it('removes a holiday', () => {
    HolidayService.addHoliday(testUserId, {
      date: '2026-12-25',
      name: 'Christmas',
    });

    expect(HolidayService.getHolidayForDate(testUserId, '2026-12-25')).toBeDefined();

    HolidayService.removeHoliday(testUserId, '2026-12-25');
    expect(HolidayService.getHolidayForDate(testUserId, '2026-12-25')).toBeUndefined();
  });

  it('correctly labels combined weekend and holiday', () => {
    // 2026-10-24 is Saturday
    HolidayService.addHoliday(testUserId, {
      date: '2026-10-24',
      name: 'Festival Day',
    });

    const info = HolidayService.getDayTypeInfo(testUserId, '2026-10-24');
    expect(info.isWeekend).toBe(true);
    expect(info.isHoliday).toBe(true);
    expect(info.isDayOff).toBe(true);
    expect(info.label).toBe('Weekend & Festival Day');
  });
});
