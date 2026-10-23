/**
 * Speedometer & Geolocation calculation utilities
 */

export type SpeedUnit = 'kmh' | 'mph' | 'pace' | 'ms';
export type SpeedometerMode = 'running' | 'cycling' | 'driving' | 'auto';

export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null; // in meters per second
}

/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaPhi = (lat2 - lat1) * rad;
  const deltaLambda = (lon2 - lon1) * rad;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Converts meters per second to the selected display unit.
 */
export function convertSpeed(metersPerSec: number, unit: SpeedUnit): number {
  if (metersPerSec <= 0 || isNaN(metersPerSec)) return 0;
  switch (unit) {
    case 'kmh':
      return metersPerSec * 3.6;
    case 'mph':
      return metersPerSec * 2.236936;
    case 'ms':
      return metersPerSec;
    case 'pace':
      // min per km: 1000 / (metersPerSec * 60)
      return metersPerSec > 0.3 ? 1000 / (metersPerSec * 60) : 0;
  }
}

/**
 * Checks whether a speed measurement is valid and non-negative.
 */
export function isValidSpeed(speed: number | null | undefined): speed is number {
  return typeof speed === 'number' && !isNaN(speed) && isFinite(speed) && speed >= 0;
}

/**
 * Formats a speed value in meters per second to the target unit display string.
 * Returns '--' (or '--:--' for pace) if the speed is null, undefined, or invalid.
 */
export function formatSpeedValue(speedMs: number | null | undefined, unit: SpeedUnit): string {
  if (!isValidSpeed(speedMs)) {
    return unit === 'pace' ? '--:--' : '--';
  }
  if (unit === 'pace') {
    return formatPace(convertSpeed(speedMs, 'pace'));
  }
  const val = convertSpeed(speedMs, unit);
  return val >= 100 ? Math.round(val).toString() : val.toFixed(1);
}

/**
 * Formats pace (minutes per km/mi) as MM:SS
 */
export function formatPace(paceDecimalMinutes: number): string {
  if (!paceDecimalMinutes || paceDecimalMinutes <= 0 || !isFinite(paceDecimalMinutes) || paceDecimalMinutes > 59) {
    return '--:--';
  }
  const mins = Math.floor(paceDecimalMinutes);
  const secs = Math.round((paceDecimalMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats duration in seconds as HH:MM:SS or MM:SS
 */
export function formatTripDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats distance depending on unit
 */
export function formatDistance(meters: number, unit: SpeedUnit): { value: string; unitLabel: string } {
  if (unit === 'mph') {
    const miles = meters / 1609.344;
    return {
      value: miles < 10 ? miles.toFixed(2) : miles.toFixed(1),
      unitLabel: 'mi',
    };
  }
  const km = meters / 1000;
  return {
    value: km < 10 ? km.toFixed(2) : km.toFixed(1),
    unitLabel: 'km',
  };
}

/**
 * Gets compass heading name (N, NE, E, SE, S, SW, W, NW) from degrees
 */
export function getHeadingCompass(degrees?: number | null): string {
  if (degrees === null || degrees === undefined || isNaN(degrees) || degrees < 0) {
    return '--';
  }
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Default maximum gauge speed for each mode
 */
export function getMaxGaugeSpeed(mode: SpeedometerMode, currentMaxSpeedKmh: number): number {
  switch (mode) {
    case 'running':
      return 25;
    case 'cycling':
      return 60;
    case 'driving':
      return 180;
    case 'auto':
    default:
      if (currentMaxSpeedKmh > 120) return 200;
      if (currentMaxSpeedKmh > 60) return 140;
      if (currentMaxSpeedKmh > 25) return 80;
      return 40;
  }
}
