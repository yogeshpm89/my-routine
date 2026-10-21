import { describe, it, expect } from 'vitest';
import {
  calculateDistanceMeters,
  convertSpeed,
  formatPace,
  formatTripDuration,
  formatDistance,
  getHeadingCompass,
  getMaxGaugeSpeed,
} from './speedometer-utils';

describe('Speedometer Utilities', () => {
  describe('calculateDistanceMeters', () => {
    it('returns 0 for identical points', () => {
      expect(calculateDistanceMeters(19.076, 72.8777, 19.076, 72.8777)).toBe(0);
    });

    it('calculates approximate distance between Mumbai and Pune (~120 km)', () => {
      const dist = calculateDistanceMeters(19.076, 72.8777, 18.5204, 73.8567);
      expect(dist).toBeGreaterThan(110000);
      expect(dist).toBeLessThan(130000);
    });
  });

  describe('convertSpeed', () => {
    it('converts m/s to km/h correctly (10 m/s = 36 km/h)', () => {
      expect(convertSpeed(10, 'kmh')).toBeCloseTo(36, 1);
    });

    it('converts m/s to mph correctly (10 m/s = ~22.37 mph)', () => {
      expect(convertSpeed(10, 'mph')).toBeCloseTo(22.37, 1);
    });

    it('converts m/s to pace correctly (e.g. 3.33 m/s = ~5 min/km)', () => {
      const pace = convertSpeed(3.3333, 'pace');
      expect(pace).toBeCloseTo(5.0, 1);
    });
  });

  describe('formatPace & formatTripDuration', () => {
    it('formats pace to MM:SS', () => {
      expect(formatPace(5.5)).toBe('5:30');
      expect(formatPace(4.25)).toBe('4:15');
      expect(formatPace(0)).toBe('--:--');
    });

    it('formats duration', () => {
      expect(formatTripDuration(65)).toBe('01:05');
      expect(formatTripDuration(3665)).toBe('1:01:05');
      expect(formatTripDuration(0)).toBe('00:00');
    });
  });

  describe('formatDistance', () => {
    it('formats kilometers and miles', () => {
      expect(formatDistance(5250, 'kmh')).toEqual({ value: '5.25', unitLabel: 'km' });
      expect(formatDistance(16093.44, 'mph')).toEqual({ value: '10.0', unitLabel: 'mi' });
    });
  });

  describe('getHeadingCompass', () => {
    it('translates degrees to cardinal directions', () => {
      expect(getHeadingCompass(0)).toBe('N');
      expect(getHeadingCompass(90)).toBe('E');
      expect(getHeadingCompass(180)).toBe('S');
      expect(getHeadingCompass(270)).toBe('W');
      expect(getHeadingCompass(null)).toBe('--');
    });
  });

  describe('getMaxGaugeSpeed', () => {
    it('returns appropriate maximum speeds', () => {
      expect(getMaxGaugeSpeed('running', 10)).toBe(25);
      expect(getMaxGaugeSpeed('cycling', 25)).toBe(60);
      expect(getMaxGaugeSpeed('driving', 80)).toBe(180);
      expect(getMaxGaugeSpeed('auto', 70)).toBe(140);
    });
  });
});
