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
} from 'lucide-react';
import { addDays, timeToMinutes, getCurrentTimeString, formatDisplayDate } from '@/lib/time-utils';

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

  React.useEffect(() => {
    setCurrentTime(getCurrentTimeString('Asia/Kolkata'));
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeString('Asia/Kolkata'));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentMinutes = timeToMinutes(currentTime);
  const formattedDate = formatDisplayDate(selectedDate);

  const completedCount = occurrences.filter((o) => o.log?.status === 'completed').length;
  const totalCount = occurrences.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Date Header Strip & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            id="btn-prev-day"
            onClick={() => onSelectDate(addDays(selectedDate, -1))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-white/5"
            title="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/5">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            id="btn-next-day"
            onClick={() => onSelectDate(addDays(selectedDate, 1))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-white/5"
            title="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <span className="text-xs sm:text-sm text-slate-400 font-medium pl-1 hidden sm:inline">
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {totalCount > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">
                {completedCount} of {totalCount} completed
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 font-semibold border border-emerald-500/30">
                {completionPercentage}%
              </span>
            </div>
          )}

          <button
            id="btn-create-activity"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Add Activity
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {occurrences.length > 0 ? (
        <div className="space-y-1">
          {occurrences.map((occurrence) => {
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
      ) : (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 space-y-3">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No activities for this day</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don&apos;t have any scheduled routines or tasks for {formattedDate}. Tap below to create one.
          </p>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition"
          >
            <Plus className="w-4 h-4" /> Add Activity
          </button>
        </div>
      )}
    </div>
  );
}
