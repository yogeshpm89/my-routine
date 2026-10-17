'use client';

import React, { useState, useEffect } from 'react';
import { ActivityOccurrence, ActivityStatus } from '@/types/routine';
import { ActivityTimelineItem } from './activity-timeline-item';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  ListFilter,
} from 'lucide-react';
import { addDays, timeToMinutes, getCurrentTimeString, formatDisplayDate, getTodayDateString } from '@/lib/time-utils';

interface TodayTimelineProps {
  occurrences: ActivityOccurrence[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onUpdateStatus: (
    occurrence: ActivityOccurrence,
    status: ActivityStatus,
    extra?: { actualStartTime?: string; actualEndTime?: string; actualDurationMinutes?: number }
  ) => void;
  onOpenCreate: () => void;
  onEdit: (occurrence: ActivityOccurrence) => void;
  onDuplicate: (occurrence: ActivityOccurrence) => void;
  onDelete: (occurrence: ActivityOccurrence) => void;
  onPlayMedia?: (occurrence: ActivityOccurrence, mediaIndex?: number) => void;
  onExecuteAi?: (occurrence: ActivityOccurrence) => void;
}

export function TodayTimeline({
  occurrences,
  selectedDate,
  onSelectDate,
  onUpdateStatus,
  onOpenCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onPlayMedia,
  onExecuteAi,
}: TodayTimelineProps) {
  const [currentTime, setCurrentTime] = useState<string>('08:00');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    setCurrentTime(getCurrentTimeString('Asia/Kolkata'));
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeString('Asia/Kolkata'));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentMinutes = timeToMinutes(currentTime);
  const formattedDate = formatDisplayDate(selectedDate);
  const todayStr = getTodayDateString('Asia/Kolkata');

  const completedCount = occurrences.filter((o) => o.log?.status === 'completed').length;
  const pendingCount = occurrences.filter((o) => o.log?.status !== 'completed' && o.log?.status !== 'skipped').length;
  const totalCount = occurrences.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter occurrences
  const filteredOccurrences = occurrences.filter((occ) => {
    if (taskFilter === 'completed') return occ.log?.status === 'completed';
    if (taskFilter === 'pending') return occ.log?.status !== 'completed' && occ.log?.status !== 'skipped';
    return true; // 'all'
  });

  // 5-day quick selector around selectedDate
  const quickDays = [-2, -1, 0, 1, 2].map((offset) => addDays(selectedDate, offset));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Header Strip & Controls */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-lg space-y-3">
        {/* Main Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Date Selector Row */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              id="btn-prev-day"
              type="button"
              onClick={() => onSelectDate(addDays(selectedDate, -1))}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="Previous day"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-white/5 min-h-[44px]">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap">
                {formattedDate}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="sr-only"
                id="timeline-native-date-input"
              />
              <label
                htmlFor="timeline-native-date-input"
                className="text-[11px] text-blue-400 font-medium hover:underline cursor-pointer pl-1"
                title="Pick date"
              >
                Pick
              </label>
            </div>

            <button
              id="btn-next-day"
              type="button"
              onClick={() => onSelectDate(addDays(selectedDate, 1))}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="Next day"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress & Add Action */}
          <div className="flex items-center gap-2.5 justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
            {totalCount > 0 ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-xs">
                  {completedCount}/{totalCount} done
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  {completionPercentage}%
                </span>
              </div>
            ) : (
              <div />
            )}

            <button
              id="btn-create-activity"
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Activity</span>
            </button>
          </div>
        </div>

        {/* Quick Day Switcher Strip (horizontal pills for fast 1-tap navigation) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar border-t border-white/5">
          {quickDays.map((dStr) => {
            const isSelected = dStr === selectedDate;
            const isToday = dStr === todayStr;
            const [y, m, d] = dStr.split('-').map(Number);
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dateObj);
            const dayNum = dateObj.getUTCDate();

            return (
              <button
                key={dStr}
                type="button"
                onClick={() => onSelectDate(dStr)}
                className={`flex-1 min-w-[54px] min-h-[46px] py-1 px-1.5 rounded-xl flex flex-col items-center justify-center border transition active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'bg-slate-800/60 border-white/5 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase leading-none ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {isToday ? 'Today' : dayName}
                </span>
                <span className="text-xs sm:text-sm font-extrabold mt-0.5 leading-none">
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Filter Strip on Mobile & Desktop */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 border border-white/10 rounded-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setTaskFilter('all')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                taskFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] opacity-75">({totalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('pending')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                taskFilter === 'pending'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Remaining</span>
              <span className="text-[10px] opacity-75">({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('completed')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                taskFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Done</span>
              <span className="text-[10px] opacity-75">({completedCount})</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Showing {filteredOccurrences.length} of {totalCount} blocks
          </span>
        </div>
      )}

      {/* Timeline Stream */}
      {filteredOccurrences.length > 0 ? (
        <div className="space-y-1">
          {filteredOccurrences.map((occurrence) => {
            const startM = timeToMinutes(occurrence.startTime);
            const endM = timeToMinutes(occurrence.endTime);
            const isCurrent =
              endM >= startM
                ? currentMinutes >= startM && currentMinutes < endM
                : currentMinutes >= startM || currentMinutes < endM;

            return (
              <ActivityTimelineItem
                key={occurrence.occurrenceId}
                occurrence={occurrence}
                isCurrent={isCurrent}
                onUpdateStatus={onUpdateStatus}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onPlayMedia={onPlayMedia}
                onExecuteAi={onExecuteAi}
              />
            );
          })}
        </div>
      ) : occurrences.length > 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No tasks match this filter</h3>
          <p className="text-xs text-slate-400">
            {taskFilter === 'pending'
              ? 'All scheduled routines for this day are completed!'
              : 'No activities have been logged as completed yet.'}
          </p>
          <button
            type="button"
            onClick={() => setTaskFilter('all')}
            className="text-xs font-semibold text-blue-400 hover:underline pt-1 inline-block"
          >
            Show All Activities
          </button>
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 space-y-3">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No activities for this day</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don&apos;t have any scheduled routines or tasks for {formattedDate}. Tap below to create one.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Activity
          </button>
        </div>
      )}
    </div>
  );
}
