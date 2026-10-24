'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Gauge,
  Play,
  Pause,
  RotateCcw,
  Compass,
  Navigation,
  Sun,
  Maximize2,
  Minimize2,
  Activity,
  CheckCircle2,
  Share2,
  Sliders,
  Radio,
  MapPin,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  SpeedUnit,
  SpeedometerMode,
  GpsPoint,
  calculateDistanceMeters,
  convertSpeed,
  formatPace,
  formatTripDuration,
  formatDistance,
  getHeadingCompass,
  getMaxGaugeSpeed,
  isValidSpeed,
  formatSpeedValue,
} from '@/lib/speedometer/speedometer-utils';
import { ActivityOccurrence } from '@/types/routine';
import { cn } from '@/lib/utils';

interface SpeedometerModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrences?: ActivityOccurrence[];
  activeOccurrence?: ActivityOccurrence | null;
  onAddComment?: (occurrence: ActivityOccurrence, text: string) => Promise<void> | void;
}

export function SpeedometerModal({
  isOpen,
  onClose,
  occurrences = [],
  activeOccurrence,
  onAddComment,
}: SpeedometerModalProps) {
  // Unit & Mode State
  const [unit, setUnit] = useState<SpeedUnit>('kmh');
  const [mode, setMode] = useState<SpeedometerMode>('auto');
  const [isHudMode, setIsHudMode] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoSpeedKmh, setDemoSpeedKmh] = useState(0);

  // Trip tracking state
  const [isTripActive, setIsTripActive] = useState(true);
  const [tripElapsedSeconds, setTripElapsedSeconds] = useState(0);
  const [tripDistanceMeters, setTripDistanceMeters] = useState(0);
  const [maxSpeedMs, setMaxSpeedMs] = useState(0);
  const [currentSpeedMs, setCurrentSpeedMs] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [currentAltitude, setCurrentAltitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'connecting' | 'connected' | 'unavailable' | 'denied'>('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>('');
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Moving speed samples for average calculation
  const movingSamplesRef = useRef<{ speed: number; time: number }[]>([]);
  const lastPointRef = useRef<GpsPoint | null>(null);
  const lastFixTimestampRef = useRef<number | null>(null);
  const isTripActiveRef = useRef(isTripActive);
  const maxSpeedMsRef = useRef(maxSpeedMs);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Keep dynamic values in refs to avoid thrashing watchPosition
  useEffect(() => {
    isTripActiveRef.current = isTripActive;
  }, [isTripActive]);

  useEffect(() => {
    maxSpeedMsRef.current = maxSpeedMs;
  }, [maxSpeedMs]);

  // Set default selected occurrence to active or first fitness routine
  useEffect(() => {
    if (activeOccurrence) {
      setSelectedOccurrenceId(activeOccurrence.occurrenceId);
    } else if (occurrences.length > 0) {
      const fitness = occurrences.find((o) => o.category === 'fitness' || o.title.toLowerCase().includes('run') || o.title.toLowerCase().includes('cycl'));
      setSelectedOccurrenceId(fitness ? fitness.occurrenceId : occurrences[0].occurrenceId);
    }
  }, [activeOccurrence, occurrences, isOpen]);

  // Trip timer
  useEffect(() => {
    if (!isOpen || !isTripActive) return;
    const interval = setInterval(() => {
      setTripElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isTripActive]);

  // Wake lock management
  useEffect(() => {
    if (!isOpen) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
        setIsWakeLockActive(false);
      }
      return;
    }

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current = lock;
          setIsWakeLockActive(true);
          lock.addEventListener('release', () => {
            setIsWakeLockActive(false);
          });
        } catch {
          // Wake lock unavailable or denied
          setIsWakeLockActive(false);
        }
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
        setIsWakeLockActive(false);
      }
    };
  }, [isOpen]);

  // GPS Staleness Watchdog (detects loss of satellite fix > 5s)
  useEffect(() => {
    if (!isOpen || isDemoMode) return;
    const watchdog = setInterval(() => {
      if (gpsStatus === 'connected' && lastFixTimestampRef.current) {
        const elapsed = Date.now() - lastFixTimestampRef.current;
        if (elapsed > 5000) {
          setGpsStatus('unavailable');
          setCurrentSpeedMs(null);
        }
      }
    }, 1000);
    return () => clearInterval(watchdog);
  }, [isOpen, isDemoMode, gpsStatus]);

  // GPS Tracking
  useEffect(() => {
    if (!isOpen || isDemoMode) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unavailable');
      setCurrentSpeedMs(null);
      return;
    }

    setGpsStatus('connecting');

    const handleSuccess = (position: GeolocationPosition) => {
      lastFixTimestampRef.current = Date.now();
      setGpsStatus('connected');
      const { latitude, longitude, speed, heading, altitude, accuracy } = position.coords;
      const timestamp = position.timestamp;

      setGpsAccuracy(accuracy || null);
      if (heading !== null && !isNaN(heading)) setCurrentHeading(heading);
      if (altitude !== null && !isNaN(altitude)) setCurrentAltitude(altitude);

      let effectiveSpeedMs: number | null = null;

      if (isValidSpeed(speed)) {
        effectiveSpeedMs = speed;
      } else if (lastPointRef.current) {
        // Fallback: calculate speed from delta distance and time
        const dt = (timestamp - lastPointRef.current.timestamp) / 1000;
        if (dt > 0.5 && dt < 10) {
          const dMeters = calculateDistanceMeters(
            lastPointRef.current.latitude,
            lastPointRef.current.longitude,
            latitude,
            longitude
          );
          if (accuracy < 50) {
            effectiveSpeedMs = dMeters / dt;
          }
        }
      }

      if (effectiveSpeedMs !== null) {
        // Filter out stationary noise (< 0.4 m/s is ~ 1.4 km/h)
        if (effectiveSpeedMs < 0.4) effectiveSpeedMs = 0;

        setCurrentSpeedMs(effectiveSpeedMs);

        if (effectiveSpeedMs > maxSpeedMsRef.current) {
          setMaxSpeedMs(effectiveSpeedMs);
        }

        if (effectiveSpeedMs > 0.5) {
          movingSamplesRef.current.push({ speed: effectiveSpeedMs, time: timestamp });
        }
      } else {
        setCurrentSpeedMs(null);
      }

      // Add to distance and moving samples if trip is active
      if (isTripActiveRef.current && lastPointRef.current) {
        const dMeters = calculateDistanceMeters(
          lastPointRef.current.latitude,
          lastPointRef.current.longitude,
          latitude,
          longitude
        );
        // Ignore inaccurate GPS jumps (> 80 m in 1 second is > 280 km/h)
        if (dMeters > 1.5 && dMeters < 80 && (accuracy || 100) < 60) {
          setTripDistanceMeters((prev) => prev + dMeters);
        }
      }

      lastPointRef.current = {
        latitude,
        longitude,
        timestamp,
        speed: effectiveSpeedMs !== null ? effectiveSpeedMs : 0,
        accuracy,
        altitude,
      };
    };

    const handleError = (error: GeolocationPositionError) => {
      setCurrentSpeedMs(null);
      if (error.code === error.PERMISSION_DENIED) {
        setGpsStatus('denied');
      } else {
        setGpsStatus('unavailable');
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 20000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, isDemoMode, retryCount]);

  // Demo speed simulation
  useEffect(() => {
    if (!isDemoMode || !isOpen) return;
    const speedMs = demoSpeedKmh / 3.6;
    setCurrentSpeedMs(speedMs);
    if (speedMs > maxSpeedMs) {
      setMaxSpeedMs(speedMs);
    }
    if (isTripActive && speedMs > 0) {
      // Simulate distance increment every second
      const interval = setInterval(() => {
        setTripDistanceMeters((prev) => prev + speedMs);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isDemoMode, demoSpeedKmh, isOpen, isTripActive, maxSpeedMs]);

  // Reset trip
  const handleResetTrip = () => {
    setTripElapsedSeconds(0);
    setTripDistanceMeters(0);
    setMaxSpeedMs(0);
    if (isDemoMode) {
      setCurrentSpeedMs(demoSpeedKmh / 3.6);
    } else if (gpsStatus !== 'connected') {
      setCurrentSpeedMs(null);
    }
    movingSamplesRef.current = [];
    lastPointRef.current = null;
  };

  // Interactive retry GPS handler
  const handleRetryGps = () => {
    setGpsStatus('connecting');
    setCurrentSpeedMs(null);
    lastFixTimestampRef.current = null;
    setRetryCount((prev) => prev + 1);
  };

  // Log to routine
  const handleLogTripToRoutine = async () => {
    const target = occurrences.find((o) => o.occurrenceId === selectedOccurrenceId) || activeOccurrence;
    if (!target || !onAddComment) return;

    const distInfo = formatDistance(tripDistanceMeters, unit);
    const maxConverted = convertSpeed(maxSpeedMs, unit);
    const avgMs = tripElapsedSeconds > 0 ? tripDistanceMeters / tripElapsedSeconds : 0;
    const avgConverted = convertSpeed(avgMs, unit);
    const durationStr = formatTripDuration(tripElapsedSeconds);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logText = `🚴 Speedometer Trip Summary (${nowStr}): Distance: ${distInfo.value} ${distInfo.unitLabel} | Duration: ${durationStr} | Avg: ${avgConverted.toFixed(1)} ${unit.toUpperCase()} | Max: ${maxConverted.toFixed(1)} ${unit.toUpperCase()}`;

    await onAddComment(target, logText);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  // Speed values in current unit
  const displayCurrentSpeed = useMemo(() => {
    const effectiveSpeed = isDemoMode
      ? currentSpeedMs
      : gpsStatus === 'connected'
      ? currentSpeedMs
      : null;
    return formatSpeedValue(effectiveSpeed, unit);
  }, [currentSpeedMs, unit, gpsStatus, isDemoMode]);

  const displayMaxSpeed = useMemo(() => {
    if (maxSpeedMs <= 0) {
      return unit === 'pace' ? '--:--' : `0.0 ${unit.toUpperCase()}`;
    }
    if (unit === 'pace') {
      return formatPace(convertSpeed(maxSpeedMs, 'pace'));
    }
    const val = convertSpeed(maxSpeedMs, unit);
    return `${val.toFixed(1)} ${unit.toUpperCase()}`;
  }, [maxSpeedMs, unit]);

  const displayAvgSpeed = useMemo(() => {
    const avgMs = tripElapsedSeconds > 0 ? tripDistanceMeters / tripElapsedSeconds : 0;
    if (unit === 'pace') {
      return formatPace(convertSpeed(avgMs, 'pace'));
    }
    const val = convertSpeed(avgMs, unit);
    return `${val.toFixed(1)} ${unit.toUpperCase()}`;
  }, [tripDistanceMeters, tripElapsedSeconds, unit]);

  const currentSpeedKmh =
    (isDemoMode || gpsStatus === 'connected') && currentSpeedMs !== null
      ? currentSpeedMs * 3.6
      : 0;
  const maxGaugeSpeed = getMaxGaugeSpeed(mode, maxSpeedMs * 3.6);

  // SVG Gauge Dial Calculations (240 degree sweep from 150 deg to 390 deg)
  const dialRadius = 110;
  const dialCenter = 150;
  const arcLength = (2 * Math.PI * dialRadius * 240) / 360; // ~460.77
  const progressRatio = Math.min(1, Math.max(0, currentSpeedKmh / maxGaugeSpeed));
  const strokeOffset = arcLength * (1 - progressRatio);
  const needleAngle = -120 + progressRatio * 240; // -120 to +120 degrees

  // Dial tick marks
  const ticks = useMemo(() => {
    const numTicks = 9; // e.g. 0, 20, 40...
    return Array.from({ length: numTicks }, (_, i) => {
      const fraction = i / (numTicks - 1);
      const val = Math.round(fraction * maxGaugeSpeed);
      const angle = (-120 + fraction * 240) * (Math.PI / 180);
      const rInner = dialRadius - 12;
      const rOuter = dialRadius;
      const rText = dialRadius - 26;
      return {
        val,
        x1: dialCenter + rInner * Math.sin(angle),
        y1: dialCenter - rInner * Math.cos(angle),
        x2: dialCenter + rOuter * Math.sin(angle),
        y2: dialCenter - rOuter * Math.cos(angle),
        tx: dialCenter + rText * Math.sin(angle),
        ty: dialCenter - rText * Math.cos(angle) + 4,
      };
    });
  }, [maxGaugeSpeed]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div
        className={cn(
          'relative w-full max-w-xl rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 border border-white/15 shadow-2xl shadow-cyan-950/40 flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300',
          isHudMode && 'transform scale-x-[-1]'
        )}
      >
        {/* Background Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="relative z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between backdrop-blur-md bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Speedometer</h2>
                {isHudMode && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    HUD Active
                  </span>
                )}
                {isDemoMode && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Demo Mode
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                {isDemoMode ? (
                  <span className="text-purple-400 font-medium">Interactive Demo</span>
                ) : gpsStatus === 'connected' ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    GPS Locked {gpsAccuracy ? `(±${Math.round(gpsAccuracy)}m)` : ''}
                  </span>
                ) : gpsStatus === 'connecting' ? (
                  <span className="text-amber-400 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Acquiring GPS...
                  </span>
                ) : gpsStatus === 'denied' ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Permission Denied
                  </span>
                ) : (
                  <span className="text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    GPS signal not available
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-speedometer-hud-toggle"
              onClick={() => setIsHudMode(!isHudMode)}
              title={isHudMode ? 'Exit HUD mode' : 'Heads-Up Display (Windshield projection)'}
              className={cn(
                'p-2 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1 min-h-[36px]',
                isHudMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border-white/5'
              )}
            >
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">HUD</span>
            </button>

            <button
              type="button"
              id="btn-speedometer-close"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-white/5 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close speedometer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="relative z-10 p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-130px)] no-scrollbar">
          {/* Unit Switcher Pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-white/10 text-xs">
              {(['kmh', 'mph', 'pace', 'ms'] as SpeedUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition cursor-pointer',
                    unit === u
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {u === 'kmh' ? 'km/h' : u.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-toggle-demo-speedometer"
                onClick={() => {
                  const nextMode = !isDemoMode;
                  setIsDemoMode(nextMode);
                  if (nextMode) {
                    if (demoSpeedKmh === 0) setDemoSpeedKmh(42);
                  } else {
                    setCurrentSpeedMs(null);
                    setGpsStatus('connecting');
                    lastFixTimestampRef.current = null;
                    setRetryCount((prev) => prev + 1);
                  }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5',
                  isDemoMode
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/40 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-white/5'
                )}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isDemoMode ? 'Exit Demo' : 'Test Drive / Demo'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Demo Speed Slider (Visible only in demo mode) */}
          {isDemoMode && (
            <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300">🎮 Indoor Simulation Speed:</span>
                <span className="font-extrabold text-white text-sm">{demoSpeedKmh} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="160"
                value={demoSpeedKmh}
                onChange={(e) => setDemoSpeedKmh(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <button
                  type="button"
                  onClick={() => setDemoSpeedKmh(0)}
                  className="hover:text-white cursor-pointer"
                >
                  0 km/h (Stop)
                </button>
                <button
                  type="button"
                  onClick={() => setDemoSpeedKmh(22)}
                  className="hover:text-white cursor-pointer"
                >
                  22 km/h (Jog)
                </button>
                <button
                  type="button"
                  onClick={() => setDemoSpeedKmh(48)}
                  className="hover:text-white cursor-pointer"
                >
                  48 km/h (Bike)
                </button>
                <button
                  type="button"
                  onClick={() => setDemoSpeedKmh(85)}
                  className="hover:text-white cursor-pointer"
                >
                  85 km/h (Car)
                </button>
              </div>
            </div>
          )}

          {/* Central Circular Gauge */}
          <div className="relative flex flex-col items-center justify-center py-2 select-none">
            <svg
              viewBox="0 0 300 280"
              className="w-full max-w-[320px] sm:max-w-[360px] drop-shadow-[0_0_30px_rgba(6,182,212,0.15)]"
            >
              <defs>
                <linearGradient id="gaugeTrackGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="45%" stopColor="#06b6d4" />
                  <stop offset="75%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Arc Track */}
              <circle
                cx={dialCenter}
                cy={dialCenter}
                r={dialRadius}
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${arcLength} 999`}
                transform={`rotate(150 ${dialCenter} ${dialCenter})`}
              />

              {/* Active Color Progress Arc */}
              <circle
                cx={dialCenter}
                cy={dialCenter}
                r={dialRadius}
                fill="none"
                stroke="url(#gaugeTrackGradient)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${arcLength} 999`}
                strokeDashoffset={strokeOffset}
                transform={`rotate(150 ${dialCenter} ${dialCenter})`}
                className="transition-all duration-300 ease-out"
              />

              {/* Dial Tick Marks & Values */}
              {ticks.map((t, idx) => (
                <g key={idx}>
                  <line
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <text
                    x={t.tx}
                    y={t.ty}
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {t.val}
                  </text>
                </g>
              ))}

              {/* Needle */}
              <g
                transform={`rotate(${needleAngle} ${dialCenter} ${dialCenter})`}
                className="transition-transform duration-200 ease-out"
                filter="url(#needleGlow)"
              >
                <polygon
                  points={`${dialCenter - 3},${dialCenter + 15} ${dialCenter + 3},${dialCenter + 15} ${dialCenter},${dialCenter - dialRadius + 18}`}
                  fill="#38bdf8"
                />
                <circle cx={dialCenter} cy={dialCenter} r="9" fill="#0284c7" />
                <circle cx={dialCenter} cy={dialCenter} r="4" fill="#ffffff" />
              </g>
            </svg>

            {/* Huge Center Digital Readout */}
            <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-full px-4 flex flex-col items-center">
              <span
                id="speedometer-digital-readout"
                data-testid="speedometer-digital-readout"
                className="block text-6xl sm:text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-md"
              >
                {displayCurrentSpeed}
              </span>
              <span className="block text-xs sm:text-sm font-extrabold uppercase tracking-widest text-cyan-400 mt-0.5">
                {unit === 'kmh' ? 'KM / H' : unit === 'pace' ? 'MIN / KM' : unit.toUpperCase()}
              </span>
              {gpsStatus === 'unavailable' && !isDemoMode && (
                <div
                  id="speedometer-center-unavailable-badge"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold animate-in fade-in"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>GPS signal not available</span>
                </div>
              )}
              {gpsStatus === 'denied' && !isDemoMode && (
                <div
                  id="speedometer-center-denied-badge"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold animate-in fade-in"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Location Permission Denied</span>
                </div>
              )}
              {gpsStatus === 'connecting' && !isDemoMode && (
                <div
                  id="speedometer-center-connecting-badge"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold animate-pulse"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                  <span>Acquiring GPS signal...</span>
                </div>
              )}
            </div>
          </div>

          {/* GPS Error & Retry Banner (when signal unavailable or permission denied) */}
          {gpsStatus === 'unavailable' && !isDemoMode && (
            <div
              id="speedometer-gps-unavailable-banner"
              className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between gap-3 animate-in fade-in"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-rose-200">GPS signal not available</div>
                  <div className="text-[11px] text-rose-300/80">
                    Ensure device location is enabled and you have a clear sky view.
                  </div>
                </div>
              </div>
              <button
                type="button"
                id="btn-retry-gps"
                onClick={handleRetryGps}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md shadow-rose-900/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry GPS</span>
              </button>
            </div>
          )}

          {gpsStatus === 'denied' && !isDemoMode && (
            <div
              id="speedometer-gps-denied-banner"
              className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between gap-3 animate-in fade-in"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-amber-200">Location Permission Denied</div>
                  <div className="text-[11px] text-amber-300/80">
                    Allow location access in your device or browser settings.
                  </div>
                </div>
              </div>
              <button
                type="button"
                id="btn-retry-gps"
                onClick={handleRetryGps}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-900/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* 4-Stat Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-0.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Max Speed</span>
              </div>
              <span className="text-base font-extrabold text-white block tabular-nums">
                {displayMaxSpeed}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-0.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Avg Speed</span>
              </div>
              <span className="text-base font-extrabold text-white block tabular-nums">
                {displayAvgSpeed}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-0.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>Distance</span>
              </div>
              <span className="text-base font-extrabold text-white block tabular-nums">
                {formatDistance(tripDistanceMeters, unit).value}{' '}
                <span className="text-xs font-semibold text-slate-400">
                  {formatDistance(tripDistanceMeters, unit).unitLabel}
                </span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-0.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Duration</span>
              </div>
              <span className="text-base font-extrabold text-white block tabular-nums">
                {formatTripDuration(tripElapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Compass & Altitude Auxiliary Strip */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Heading:</span>
              <strong className="text-white">
                {getHeadingCompass(currentHeading)}{' '}
                {currentHeading !== null ? `(${Math.round(currentHeading)}°)` : ''}
              </strong>
            </div>

            {currentAltitude !== null && (
              <div className="flex items-center gap-1.5">
                <span>Elevation:</span>
                <strong className="text-white">{Math.round(currentAltitude)} m</strong>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', isWakeLockActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
              <span className="text-[11px]">{isWakeLockActive ? 'Screen Awake' : 'Normal Timeout'}</span>
            </div>
          </div>

          {/* Trip Controls */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="btn-speedometer-toggle-trip"
              onClick={() => setIsTripActive(!isTripActive)}
              className={cn(
                'flex-1 min-h-[46px] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer',
                isTripActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              )}
            >
              {isTripActive ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause Trip</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume Trip</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-speedometer-reset-trip"
              onClick={handleResetTrip}
              className="px-4 py-3 min-h-[46px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Reset trip statistics"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          {/* Save to Routine Activity Notes Section */}
          {occurrences.length > 0 && onAddComment && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Log Trip to Routine Activity:</span>
                </span>
                {isSavedToast && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Saved to Notes!
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedOccurrenceId}
                  onChange={(e) => setSelectedOccurrenceId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {occurrences.map((o) => (
                    <option key={o.occurrenceId} value={o.occurrenceId}>
                      {o.title} ({o.startTime} - {o.endTime})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  id="btn-save-trip-to-routine"
                  onClick={handleLogTripToRoutine}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-md shadow-blue-600/20 whitespace-nowrap"
                >
                  Save to Notes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
