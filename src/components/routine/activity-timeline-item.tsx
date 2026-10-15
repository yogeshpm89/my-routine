'use client';

import React from 'react';
import { ActivityOccurrence, ActivityStatus } from '@/types/routine';
import { formatTime12Hour, formatDuration } from '@/lib/time-utils';
import { CategoryBadge } from './activity-badge';
import {
  CheckCircle2,
  Play,
  Lock,
  Edit2,
  Copy,
  Trash2,
  Sparkles,
  FastForward,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityTimelineItemProps {
  occurrence: ActivityOccurrence;
  isCurrent?: boolean;
  onUpdateStatus: (
    occurrence: ActivityOccurrence,
    status: ActivityStatus,
    extra?: { actualStartTime?: string; actualEndTime?: string; actualDurationMinutes?: number }
  ) => void;
  onEdit: (occurrence: ActivityOccurrence) => void;
  onDuplicate: (occurrence: ActivityOccurrence) => void;
  onDelete: (occurrence: ActivityOccurrence) => void;
}

export function ActivityTimelineItem({
  occurrence,
  isCurrent = false,
  onUpdateStatus,
  onEdit,
  onDuplicate,
  onDelete,
}: ActivityTimelineItemProps) {
  const status = occurrence.log?.status ?? 'pending';

  const statusStyles: Record<
    ActivityStatus,
    { badgeBg: string; badgeText: string; nodeBg: string; border: string }
  > = {
    pending: {
      badgeBg: 'bg-slate-800/80',
      badgeText: 'text-slate-400',
      nodeBg: 'bg-slate-700',
      border: 'border-white/5',
    },
    in_progress: {
      badgeBg: 'bg-blue-950/80',
      badgeText: 'text-blue-400 font-semibold',
      nodeBg: 'bg-blue-500 animate-pulse',
      border: 'border-blue-500/40',
    },
    completed: {
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-400 font-semibold',
      nodeBg: 'bg-emerald-500',
      border: 'border-emerald-500/30',
    },
    partial: {
      badgeBg: 'bg-amber-950/80',
      badgeText: 'text-amber-400',
      nodeBg: 'bg-amber-500',
      border: 'border-amber-500/30',
    },
    skipped: {
      badgeBg: 'bg-rose-950/60',
      badgeText: 'text-rose-400 line-through',
      nodeBg: 'bg-rose-600',
      border: 'border-rose-500/30',
    },
    postponed: {
      badgeBg: 'bg-purple-950/80',
      badgeText: 'text-purple-400',
      nodeBg: 'bg-purple-500',
      border: 'border-purple-500/30',
    },
  };

  const currentStyle = statusStyles[status];

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 sm:gap-5 transition-all duration-200',
        status === 'completed' && 'opacity-85',
        status === 'skipped' && 'opacity-60'
      )}
    >
      {/* Time Column */}
      <div className="w-20 sm:w-28 shrink-0 text-right pt-2.5">
        <span className="block text-xs sm:text-sm font-bold text-white tracking-tight">
          {formatTime12Hour(occurrence.startTime)}
        </span>
        <span className="block text-[11px] text-slate-400 font-medium">
          {formatTime12Hour(occurrence.endTime)}
        </span>
        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-400 font-medium border border-white/5">
          {formatDuration(occurrence.durationMinutes)}
        </span>
      </div>

      {/* Timeline Node & Line */}
      <div className="relative flex flex-col items-center self-stretch">
        <div
          className={cn(
            'w-4 h-4 rounded-full border-2 border-slate-950 z-10 transition-transform group-hover:scale-125 shadow-md',
            currentStyle.nodeBg,
            isCurrent && 'ring-4 ring-blue-500/30'
          )}
        />
        <div className="w-0.5 grow bg-slate-800 my-1 group-last:hidden" />
      </div>

      {/* Main Content Card */}
      <div
        className={cn(
          'grow rounded-xl p-3.5 sm:p-4 transition-all duration-200 border shadow-lg backdrop-blur-md mb-3',
          currentStyle.border,
          isCurrent
            ? 'bg-slate-900/90 ring-1 ring-blue-500/40 shadow-blue-900/20'
            : 'bg-slate-900/60 hover:bg-slate-900/90 hover:border-white/20'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                onClick={() => onEdit(occurrence)}
                className={cn(
                  'text-base sm:text-lg font-semibold text-white tracking-tight cursor-pointer hover:text-blue-300 transition-colors',
                  status === 'completed' && 'text-slate-300',
                  status === 'skipped' && 'line-through text-slate-500'
                )}
              >
                {occurrence.title}
              </h3>

              {occurrence.isFixed && (
                <span
                  title="Fixed Commitment: Protected from accidental rescheduling"
                  className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.5 rounded"
                >
                  <Lock className="w-2.5 h-2.5" /> Fixed
                </span>
              )}

              {occurrence.hasOverride && (
                <span
                  title="Single-day override active"
                  className="inline-flex items-center gap-1 text-[11px] text-purple-300 bg-purple-950/70 border border-purple-500/30 px-1.5 py-0.5 rounded"
                >
                  <Sparkles className="w-2.5 h-2.5" /> Exception
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <CategoryBadge category={occurrence.category} size="sm" />
              {status !== 'pending' && (
                <span
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full border border-white/5 capitalize',
                    currentStyle.badgeBg,
                    currentStyle.badgeText
                  )}
                >
                  {status.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex items-center gap-1 shrink-0">
            {status !== 'completed' ? (
              <>
                {status !== 'in_progress' && (
                  <button
                    onClick={() =>
                      onUpdateStatus(occurrence, 'in_progress', {
                        actualStartTime: occurrence.startTime,
                      })
                    }
                    title="Mark in progress"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() =>
                    onUpdateStatus(occurrence, 'completed', {
                      actualDurationMinutes: occurrence.durationMinutes,
                    })
                  }
                  title="Mark complete"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onUpdateStatus(occurrence, 'skipped')}
                  title="Skip activity"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                >
                  <FastForward className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onUpdateStatus(occurrence, 'pending')}
                title="Reset status"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onEdit(occurrence)}
              title="Edit activity"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDuplicate(occurrence)}
              title="Duplicate activity"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(occurrence)}
              title="Delete activity"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Optional Notes & Log info */}
        {(occurrence.notes || occurrence.log?.completionNotes) && (
          <div className="mt-2 text-xs text-slate-400 space-y-1">
            {occurrence.notes && <p>{occurrence.notes}</p>}
            {occurrence.log?.completionNotes && (
              <p className="text-emerald-400/90 font-medium bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/20">
                Log: {occurrence.log.completionNotes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
