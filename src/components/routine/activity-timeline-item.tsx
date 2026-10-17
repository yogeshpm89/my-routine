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
  Music,
  Video,
  Clock,
} from 'lucide-react';
import { YouTubeIcon as Youtube } from '@/components/media/youtube-icon';
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
  onPlayMedia?: (occurrence: ActivityOccurrence, mediaIndex?: number) => void;
  onExecuteAi?: (occurrence: ActivityOccurrence) => void;
}

export function ActivityTimelineItem({
  occurrence,
  isCurrent = false,
  onUpdateStatus,
  onEdit,
  onDuplicate,
  onDelete,
  onPlayMedia,
  onExecuteAi,
}: ActivityTimelineItemProps) {
  const status = occurrence.log?.status ?? 'pending';
  const isCompleted = status === 'completed';
  const isSkipped = status === 'skipped';
  const isInProgress = status === 'in_progress';

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

  // Quick 1-tap completion toggle for mobile
  const handleToggleCompletion = () => {
    if (isCompleted) {
      onUpdateStatus(occurrence, 'pending');
    } else {
      onUpdateStatus(occurrence, 'completed', {
        actualDurationMinutes: occurrence.durationMinutes,
      });
    }
  };

  return (
    <div
      className={cn(
        'group relative flex items-start gap-0 sm:gap-5 transition-all duration-200 w-full mb-3',
        isCompleted && 'opacity-85',
        isSkipped && 'opacity-60'
      )}
    >
      {/* Desktop Time Column (hidden on mobile to give task full width) */}
      <div className="hidden sm:block w-24 sm:w-28 shrink-0 text-right pt-2.5">
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

      {/* Desktop Timeline Node & Line (hidden on mobile) */}
      <div className="hidden sm:flex relative flex-col items-center self-stretch">
        <div
          className={cn(
            'w-4 h-4 rounded-full border-2 border-slate-950 z-10 transition-transform group-hover:scale-125 shadow-md',
            currentStyle.nodeBg,
            isCurrent && 'ring-4 ring-blue-500/30'
          )}
        />
        <div className="w-0.5 grow bg-slate-800 my-1 group-last:hidden" />
      </div>

      {/* Main Task Card (Full width on mobile with left accent bar) */}
      <div
        style={{ borderLeftColor: occurrence.color || '#3b82f6', borderLeftWidth: '4px' }}
        className={cn(
          'w-full grow rounded-2xl p-3 sm:p-4 transition-all duration-200 border shadow-md backdrop-blur-md',
          currentStyle.border,
          isCurrent
            ? 'bg-slate-900/95 ring-1 ring-blue-500/40 shadow-blue-900/20'
            : 'bg-slate-900/60 hover:bg-slate-900/90 hover:border-white/20'
        )}
      >
        {/* Mobile Header: Time Badge & Category Row */}
        <div className="flex sm:hidden items-center justify-between gap-2 pb-2 mb-2 border-b border-white/5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              {formatTime12Hour(occurrence.startTime)} – {formatTime12Hour(occurrence.endTime)}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({formatDuration(occurrence.durationMinutes)})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {occurrence.isFixed && (
              <span
                title="Fixed commitment"
                className="inline-flex items-center gap-0.5 text-[10px] text-amber-300 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.2 rounded"
              >
                <Lock className="w-2.5 h-2.5" /> Fixed
              </span>
            )}
            <CategoryBadge category={occurrence.category} size="sm" />
          </div>
        </div>

        {/* Primary Row: 1-Tap Checkbox + Title + Action Strip */}
        <div className="flex items-start justify-between gap-2.5">
          {/* Left Checkbox Button & Title */}
          <div className="flex items-start gap-2.5 grow min-w-0">
            {/* 1-Tap Thumb Completion Button */}
            <button
              type="button"
              onClick={handleToggleCompletion}
              aria-label={isCompleted ? 'Mark as pending' : 'Mark as complete'}
              className="min-w-[40px] min-h-[40px] -ml-1 -mt-0.5 flex items-center justify-center shrink-0 text-slate-400 hover:text-emerald-400 transition cursor-pointer active:scale-95"
            >
              {isCompleted ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-sm shadow-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              ) : isSkipped ? (
                <div className="w-6 h-6 rounded-full border-2 border-rose-500/60 flex items-center justify-center text-rose-400">
                  <FastForward className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-slate-600 hover:border-emerald-400 transition flex items-center justify-center group-hover:border-slate-400" />
              )}
            </button>

            {/* Task Title & Badges */}
            <div className="grow min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  onClick={() => onEdit(occurrence)}
                  className={cn(
                    'text-sm sm:text-base font-semibold text-white tracking-tight cursor-pointer hover:text-blue-300 transition-colors leading-snug',
                    isCompleted && 'text-slate-400 line-through font-normal',
                    isSkipped && 'text-slate-500 line-through italic'
                  )}
                >
                  {occurrence.title}
                </h3>

                {/* Desktop Badges */}
                <div className="hidden sm:inline-flex items-center gap-1.5">
                  {occurrence.isFixed && (
                    <span
                      title="Fixed Commitment"
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
                  <CategoryBadge category={occurrence.category} size="sm" />
                </div>
              </div>

              {/* Status pill on mobile if special */}
              {status !== 'pending' && status !== 'completed' && (
                <div className="flex sm:hidden items-center gap-1">
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border border-white/5 capitalize font-medium',
                      currentStyle.badgeBg,
                      currentStyle.badgeText
                    )}
                  >
                    {status.replace('_', ' ')}
                  </span>
                </div>
              )}

              {/* Attached Media Chips */}
              {occurrence.media && occurrence.media.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {occurrence.media.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayMedia?.(occurrence, idx);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-white/10 shadow-sm transition active:scale-95 cursor-pointer"
                      title={`Play ${item.title || item.fileName || 'media'}`}
                    >
                      {item.type === 'youtube' ? (
                        <Youtube className="w-3 h-3 text-rose-500" />
                      ) : item.type === 'audio_url' || (item.type === 'local_file' && item.mimeType?.startsWith('audio/')) ? (
                        <Music className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Video className="w-3 h-3 text-blue-400" />
                      )}
                      <span className="truncate max-w-[120px]">
                        {item.title || item.fileName || 'Play'}
                      </span>
                      <Play className="w-2.5 h-2.5 fill-current opacity-70 ml-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Strip */}
          <div className="flex items-center gap-1 shrink-0">
            {occurrence.aiActionId && (
              <button
                type="button"
                onClick={() => onExecuteAi?.(occurrence)}
                title="Execute attached AI Routine Action"
                className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 transition cursor-pointer flex items-center justify-center active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}

            {!isCompleted && !isInProgress && (
              <button
                type="button"
                onClick={() =>
                  onUpdateStatus(occurrence, 'in_progress', {
                    actualStartTime: occurrence.startTime,
                  })
                }
                title="Start activity"
                className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}

            {!isCompleted && (
              <button
                type="button"
                onClick={() => onUpdateStatus(occurrence, 'skipped')}
                title="Skip activity"
                className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            )}

            {isCompleted && (
              <button
                type="button"
                onClick={() => onUpdateStatus(occurrence, 'pending')}
                title="Reset to pending"
                className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(occurrence)}
              title="Edit routine"
              className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDuplicate(occurrence)}
              title="Duplicate activity"
              className="hidden md:flex min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition items-center justify-center active:scale-95 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              id={`btn-delete-occurrence-${occurrence.templateId}`}
              onClick={() => onDelete(occurrence)}
              title="Delete or cancel occurrence"
              className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer flex items-center justify-center active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Optional Notes & Completion Log Info */}
        {(occurrence.notes || occurrence.log?.completionNotes) && (
          <div className="mt-2.5 pt-2 border-t border-white/5 text-xs text-slate-400 space-y-1">
            {occurrence.notes && <p className="line-clamp-2">{occurrence.notes}</p>}
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
