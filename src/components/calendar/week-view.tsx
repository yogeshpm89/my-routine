'use client';

import React from 'react';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
  ActivityOccurrence,
  GoalTarget,
} from '@/types/routine';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { detectScheduleConflicts } from '@/lib/conflict-detector';
import {
  addDays,
  formatTime12Hour,
  formatDuration,
  getDayOfWeek,
} from '@/lib/time-utils';
import { ChevronLeft, ChevronRight, Lock, AlertTriangle, AlertCircle } from 'lucide-react';

interface WeekViewProps {
  selectedDate: string; // YYYY-MM-DD
  templates: RoutineTemplate[];
  overrides: OccurrenceOverride[];
  logs: ActivityLog[];
  goals: GoalTarget[];
  onSelectDate: (date: string) => void;
  onOpenActivity: (occurrence: ActivityOccurrence) => void;
  onSwitchToDay: () => void;
}

export function WeekView({
  selectedDate,
  templates,
  overrides,
  logs,
  goals,
  onSelectDate,
  onOpenActivity,
  onSwitchToDay,
}: WeekViewProps) {
  // Find start of the week (Monday)
  const currentDayOfWeek = getDayOfWeek(selectedDate); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const startOfWeek = addDays(selectedDate, mondayOffset);

  // Generate 7 days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i));

  const weekEnd = weekDays[6];

  const handlePrevWeek = () => onSelectDate(addDays(selectedDate, -7));
  const handleNextWeek = () => onSelectDate(addDays(selectedDate, 7));

  return (
    <div className="space-y-4">
      {/* Week Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrevWeek}
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5 flex items-center justify-center active:scale-95"
            title="Previous week"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs sm:text-base font-bold text-white px-2 text-center">
            {startOfWeek} to {weekEnd}
          </span>
          <button
            onClick={handleNextWeek}
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5 flex items-center justify-center active:scale-95"
            title="Next week"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToDay}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition flex items-center justify-center active:scale-95"
          >
            Switch to Day View
          </button>
        </div>
      </div>

      {/* Mobile Day Selector Ribbon */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {weekDays.map((dateStr) => {
          const isSelected = dateStr === selectedDate;
          const [y, m, d] = dateStr.split('-').map(Number);
          const dateObj = new Date(Date.UTC(y, m - 1, d));
          const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dateObj);
          const dayNum = dateObj.getUTCDate();
          const dayOccurrences = generateDailyOccurrences(templates, overrides, logs, dateStr);
          const dayDow = getDayOfWeek(dateStr);
          const conflicts = detectScheduleConflicts(dayOccurrences, goals, dayDow);
          const hasError = conflicts.some((c) => c.severity === 'error');
          const hasWarning = conflicts.some((c) => c.severity === 'warning');

          return (
            <button
              key={`ribbon-${dateStr}`}
              onClick={() => onSelectDate(dateStr)}
              className={`flex-1 min-w-[46px] min-h-[52px] py-1.5 px-1 rounded-xl flex flex-col items-center justify-center border transition active:scale-95 ${
                isSelected
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/25'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                {dayName}
              </span>
              <span className="text-sm font-extrabold leading-tight">
                {dayNum}
              </span>
              <div className="flex items-center gap-0.5 mt-0.5 h-1.5">
                {hasError ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                ) : hasWarning ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                ) : dayOccurrences.length > 0 ? (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-blue-400/80'}`} />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* 7-Day Horizontal Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {weekDays.map((dateStr) => {
          const dayOccurrences = generateDailyOccurrences(templates, overrides, logs, dateStr);
          const dayDow = getDayOfWeek(dateStr);
          const conflicts = detectScheduleConflicts(dayOccurrences, goals, dayDow);
          const errors = conflicts.filter((c) => c.severity === 'error');
          const warnings = conflicts.filter((c) => c.severity === 'warning');

          const completedCount = dayOccurrences.filter((o) => o.log?.status === 'completed').length;
          const totalScheduledMinutes = dayOccurrences.reduce((sum, o) => sum + o.durationMinutes, 0);

          const isSelected = dateStr === selectedDate;
          const [y, m, d] = dateStr.split('-').map(Number);
          const dateObj = new Date(Date.UTC(y, m - 1, d));
          const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dateObj);
          const dayNum = dateObj.getUTCDate();

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`rounded-2xl p-3 border transition-all duration-150 flex flex-col cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 ring-2 ring-blue-500 border-transparent shadow-xl shadow-blue-900/20'
                  : 'bg-slate-900/50 border-white/10 hover:bg-slate-900/80 hover:border-white/20'
              }`}
            >
              {/* Day Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">
                    {dayName}
                  </span>
                  <span className="text-lg font-extrabold text-white leading-none">
                    {dayNum}
                  </span>
                </div>

                {/* Conflict Badges */}
                <div className="flex items-center gap-1">
                  {errors.length > 0 && (
                    <span
                      title={`${errors.length} fixed collision error(s)`}
                      className="p-1 rounded-md bg-rose-500/20 text-rose-400"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {warnings.length > 0 && errors.length === 0 && (
                    <span
                      title={`${warnings.length} advisory notice(s)`}
                      className="p-1 rounded-md bg-amber-500/20 text-amber-400"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>

              {/* Day Metrics */}
              <div className="py-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>{formatDuration(totalScheduledMinutes)}</span>
                {dayOccurrences.length > 0 && (
                  dayOccurrences.every((o) => o.log?.status === 'skipped') ? (
                    <span className="text-amber-400 font-medium">🌴 Day Off</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">
                      {completedCount}/{dayOccurrences.length} done
                    </span>
                  )
                )}
              </div>

              {/* Occurrences Mini List */}
              <div className="space-y-1.5 grow max-h-72 overflow-y-auto pr-0.5">
                {dayOccurrences.slice(0, 6).map((occ) => {
                  const isCompleted = occ.log?.status === 'completed';
                  const isSkipped = occ.log?.status === 'skipped';
                  return (
                    <div
                      key={occ.occurrenceId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenActivity(occ);
                      }}
                      className={`min-h-[36px] p-2 rounded-xl border text-[11px] transition hover:scale-[1.01] active:scale-95 flex items-center justify-between gap-1.5 ${
                        isCompleted
                          ? 'bg-slate-800/40 border-white/5 opacity-60 text-slate-400 line-through'
                          : isSkipped
                          ? 'bg-rose-950/30 border-rose-500/20 opacity-70 text-rose-300 line-through'
                          : 'bg-slate-800/80 border-white/5 text-slate-200'
                      }`}
                      style={{ borderLeftColor: occ.color, borderLeftWidth: '3px' }}
                    >
                      <span className="truncate font-medium">{occ.title}</span>
                      {occ.isFixed && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                    </div>
                  );
                })}

                {dayOccurrences.length > 6 && (
                  <div className="text-[10px] text-blue-400 font-semibold text-center pt-1">
                    +{dayOccurrences.length - 6} more blocks
                  </div>
                )}

                {dayOccurrences.length === 0 && (
                  <div className="text-[11px] text-slate-600 text-center py-6">
                    No activities
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
