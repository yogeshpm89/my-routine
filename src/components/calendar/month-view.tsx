'use client';

import React, { useState } from 'react';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
  GoalTarget,
} from '@/types/routine';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { detectScheduleConflicts } from '@/lib/conflict-detector';
import { getDayOfWeek } from '@/lib/time-utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthViewProps {
  selectedDate: string; // YYYY-MM-DD
  templates: RoutineTemplate[];
  overrides: OccurrenceOverride[];
  logs: ActivityLog[];
  goals: GoalTarget[];
  onSelectDate: (date: string) => void;
  onSwitchToDay: () => void;
}

export function MonthView({
  selectedDate,
  templates,
  overrides,
  logs,
  goals,
  onSelectDate,
  onSwitchToDay,
}: MonthViewProps) {
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return { year: y, month: m }; // month 1-12
  });

  const { year, month } = currentYearMonth;

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  // Compute days in month
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sun
  const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0 for Mon, 6 for Sun

  // Matrix generation
  const calendarCells: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Padding from previous month
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  for (let i = mondayOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevM = month === 1 ? 12 : month - 1;
    const prevY = month === 1 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNum: day, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  // Padding to fill trailing cells
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      {/* Month Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrevMonth}
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5 flex items-center justify-center active:scale-95"
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base sm:text-lg font-bold text-white px-2">
            {monthName}
          </span>
          <button
            onClick={handleNextMonth}
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5 flex items-center justify-center active:scale-95"
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onSwitchToDay}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition flex items-center justify-center active:scale-95"
        >
          Switch to Day View
        </button>
      </div>

      {/* Calendar Matrix */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/60 backdrop-blur-md">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-slate-950/60">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="py-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              {h}
            </div>
          ))}
        </div>

        {/* Date Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-white/5">
          {calendarCells.map((cell) => {
            const isSelected = cell.dateStr === selectedDate;
            const dayOccurrences = cell.isCurrentMonth
              ? generateDailyOccurrences(templates, overrides, logs, cell.dateStr)
              : [];
            const dayDow = getDayOfWeek(cell.dateStr);
            const conflicts = cell.isCurrentMonth
              ? detectScheduleConflicts(dayOccurrences, goals, dayDow)
              : [];
            const hasError = conflicts.some((c) => c.severity === 'error');
            const hasWarning = conflicts.some((c) => c.severity === 'warning');

            const completed = dayOccurrences.filter((o) => o.log?.status === 'completed').length;

            return (
              <div
                key={cell.dateStr}
                onClick={() => {
                  onSelectDate(cell.dateStr);
                  onSwitchToDay();
                }}
                className={`min-h-[64px] sm:min-h-[105px] p-1 sm:p-2 flex flex-col justify-between transition cursor-pointer select-none active:scale-[0.98] ${
                  !cell.isCurrentMonth ? 'opacity-30 bg-slate-950/40' : 'hover:bg-slate-800/60'
                } ${isSelected ? 'ring-2 ring-blue-500 bg-slate-800/80 z-10' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-blue-400 font-extrabold' : 'text-slate-200'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Conflict indicator dots */}
                  <div className="flex items-center gap-0.5">
                    {hasError && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500" title="Fixed event collision" />}
                    {hasWarning && !hasError && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400" title="Schedule warning or goal deficit" />}
                  </div>
                </div>

                {cell.isCurrentMonth && dayOccurrences.length > 0 && (
                  <div className="space-y-0.5 sm:space-y-1 mt-1">
                    {/* Compact indicator on mobile */}
                    <div className="flex sm:hidden items-center gap-1 flex-wrap">
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-slate-300 font-semibold">
                        {dayOccurrences.length}
                      </span>
                      {completed > 0 && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-400 font-bold">
                          {completed}✓
                        </span>
                      )}
                    </div>

                    {/* Detailed text on tablet / desktop */}
                    <div className="hidden sm:block text-[10px] text-slate-400">
                      {dayOccurrences.length} activities
                    </div>
                    {completed > 0 && (
                      <div className="hidden sm:block text-[10px] text-emerald-400 font-medium">
                        {completed} completed
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
