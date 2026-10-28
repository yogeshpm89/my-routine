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
  ListChecks,
  Check,
  ChevronDown,
  MessageSquare,
  Send,
  X,
  FileText,
  ExternalLink,
  ArrowLeftRight,
} from 'lucide-react';
import { YouTubeIcon as Youtube } from '@/components/media/youtube-icon';
import { MusicServiceIcon } from '@/components/media/music-service-icons';
import { getMusicServiceInfo, openExternalMusicApp } from '@/lib/media/media-storage';
import { cn } from '@/lib/utils';
import { getActivityTheme } from '@/lib/activity-styles';
import { VoiceInputButton } from './voice-input-button';

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
  onToggleStep?: (occurrence: ActivityOccurrence, stepId: string) => void;
  onOpenReplace?: (occurrence: ActivityOccurrence) => void;
  onAddComment?: (occurrence: ActivityOccurrence, text: string) => Promise<void> | void;
  onUpdateComment?: (occurrence: ActivityOccurrence, commentId: string, text: string) => Promise<void> | void;
  onDeleteComment?: (occurrence: ActivityOccurrence, commentId: string) => Promise<void> | void;
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
  onToggleStep,
  onOpenReplace,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: ActivityTimelineItemProps) {
  const [showSteps, setShowSteps] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const [newCommentText, setNewCommentText] = React.useState('');
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState('');
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);

  const comments = occurrence.comments || occurrence.log?.comments || [];
  const allComments = [
    ...comments,
    ...(occurrence.log?.completionNotes && !comments.some((c) => c.text === occurrence.log?.completionNotes)
      ? [{ id: `log_note_${occurrence.occurrenceId}`, text: occurrence.log.completionNotes, createdAt: occurrence.log.updatedAt || Date.now() }]
      : []),
  ];

  const handleAddCommentSubmit = async () => {
    if (!newCommentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await onAddComment?.(occurrence, newCommentText.trim());
      setNewCommentText('');
      setShowComments(true);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const isReplaced = Boolean(occurrence.isReplaced || occurrence.log?.status === 'replaced');
  const isReplacement = Boolean(occurrence.isReplacement);
  const isRescheduled = Boolean(occurrence.isRescheduled);

  const status = occurrence.log?.status ?? (isReplaced ? 'replaced' : isRescheduled ? 'rescheduled' : 'pending');
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
    replaced: {
      badgeBg: 'bg-purple-950/80',
      badgeText: 'text-purple-300 font-medium',
      nodeBg: 'bg-purple-600',
      border: 'border-purple-500/30 border-dashed',
    },
    rescheduled: {
      badgeBg: 'bg-blue-950/80',
      badgeText: 'text-blue-300 font-medium',
      nodeBg: 'bg-blue-600',
      border: 'border-blue-500/30',
    },
  };

  const currentStyle = statusStyles[status];
  const theme = getActivityTheme(occurrence.category);

  // Quick 1-tap completion toggle for mobile
  const handleToggleCompletion = () => {
    if (isReplaced) return; // Replaced original cannot be toggled
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
            isCurrent && cn('ring-4', theme.timelineCurrentRing)
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
            ? cn('bg-gradient-to-br', theme.cardGradient, theme.borderColor, 'shadow-lg ring-1', theme.timelineCurrentRing)
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
              disabled={isReplaced}
              aria-label={isReplaced ? 'Replaced activity' : isCompleted ? 'Mark as pending' : 'Mark as complete'}
              className={cn(
                'min-w-[40px] min-h-[40px] -ml-1 -mt-0.5 flex items-center justify-center shrink-0 text-slate-400 hover:text-emerald-400 transition cursor-pointer active:scale-95',
                isReplaced && 'cursor-not-allowed opacity-60'
              )}
            >
              {isCompleted ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-sm shadow-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              ) : isSkipped ? (
                <div className="w-6 h-6 rounded-full border-2 border-rose-500/60 flex items-center justify-center text-rose-400">
                  <FastForward className="w-3.5 h-3.5" />
                </div>
              ) : isReplaced ? (
                <div className="w-6 h-6 rounded-full border-2 border-purple-500/60 bg-purple-950/40 flex items-center justify-center text-purple-400" title="Replaced for today">
                  <ArrowLeftRight className="w-3 h-3" />
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
                    isSkipped && 'text-slate-500 line-through italic',
                    isReplaced && 'text-slate-400 line-through italic'
                  )}
                >
                  {occurrence.title}
                </h3>

                {/* Desktop Badges */}
                <div className="hidden sm:inline-flex items-center gap-1.5">
                  {isReplaced && (
                    <span
                      title={occurrence.replacementReason ? `Replaced: ${occurrence.replacementReason}` : 'Replaced for today'}
                      className="inline-flex items-center gap-1 text-[11px] text-purple-300 bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded-full font-medium"
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" /> Replaced
                    </span>
                  )}
                  {isReplacement && (
                    <span
                      title={`Replacement for planned "${occurrence.replacesTitle || 'routine'}"`}
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-full font-medium"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Replacement
                    </span>
                  )}
                  {isRescheduled && (
                    <span
                      title="Rescheduled from original time"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-300 bg-blue-950/80 border border-blue-500/40 px-2 py-0.5 rounded-full font-medium"
                    >
                      <Clock className="w-2.5 h-2.5" /> Rescheduled
                    </span>
                  )}
                  {occurrence.isFixed && (
                    <span
                      title="Fixed Commitment"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.5 rounded"
                    >
                      <Lock className="w-2.5 h-2.5" /> Fixed
                    </span>
                  )}
                  {occurrence.hasOverride && !isReplaced && !isReplacement && !isRescheduled && (
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

              {/* Substitution Details Note */}
              {isReplaced && occurrence.replacement && (
                <div className="flex items-center gap-1.5 text-xs text-purple-300/90 pt-0.5">
                  <ArrowLeftRight className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>
                    Substituted by <strong className="text-white">&quot;{occurrence.replacement.title}&quot;</strong>
                    {occurrence.replacementReason && ` (${occurrence.replacementReason})`}
                  </span>
                </div>
              )}
              {isReplacement && occurrence.replacesTitle && (
                <div className="flex items-center gap-1.5 text-xs text-cyan-300/90 pt-0.5">
                  <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>
                    Substituted for planned <strong className="text-white">&quot;{occurrence.replacesTitle}&quot;</strong>
                    {occurrence.replacementReason && ` (${occurrence.replacementReason})`}
                  </span>
                </div>
              )}
              {isRescheduled && occurrence.rescheduledFrom && (
                <div className="flex items-center gap-1.5 text-xs text-blue-300/90 pt-0.5">
                  <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>
                    Rescheduled from planned time <strong className="text-white">{formatTime12Hour(occurrence.rescheduledFrom.originalStartTime)}–{formatTime12Hour(occurrence.rescheduledFrom.originalEndTime)}</strong>
                  </span>
                </div>
              )}

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
                  {occurrence.media.map((item, idx) => {
                    const musicInfo = getMusicServiceInfo(item.url || '');
                    const isMusic = item.type === 'music_service' || musicInfo.isMusicService;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMusic && item.url) {
                            openExternalMusicApp(item.url);
                          } else {
                            onPlayMedia?.(occurrence, idx);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border shadow-sm transition active:scale-95 cursor-pointer ${
                          isMusic
                            ? `${musicInfo.badgeBg} hover:bg-slate-700/90`
                            : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-white/10'
                        }`}
                        title={
                          isMusic
                            ? `Open in ${musicInfo.serviceName} app`
                            : `Play ${item.title || item.fileName || 'media'}`
                        }
                      >
                        {isMusic ? (
                          <MusicServiceIcon service={musicInfo.service} className="w-3 h-3" />
                        ) : item.type === 'youtube' ? (
                          <Youtube className="w-3 h-3 text-rose-500" />
                        ) : item.type === 'audio_url' || (item.type === 'local_file' && item.mimeType?.startsWith('audio/')) ? (
                          <Music className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Video className="w-3 h-3 text-blue-400" />
                        )}
                        <span className="truncate max-w-[120px]">
                          {item.title || (isMusic ? `${musicInfo.serviceName} Playlist` : item.fileName || 'Play')}
                        </span>
                        {isMusic ? (
                          <ExternalLink className="w-2.5 h-2.5 opacity-80 ml-0.5" />
                        ) : (
                          <Play className="w-2.5 h-2.5 fill-current opacity-70 ml-0.5" />
                        )}
                      </button>
                    );
                  })}
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

            {!isCompleted && !isSkipped && (
              <button
                type="button"
                onClick={() => onUpdateStatus(occurrence, 'skipped')}
                title="Skip activity"
                className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            )}

            {isSkipped && (
              <button
                type="button"
                onClick={() => onUpdateStatus(occurrence, 'pending')}
                title="Unskip activity (reset to pending)"
                className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-amber-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
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
              onClick={() => setShowComments(!showComments)}
              title={allComments.length > 0 ? `${allComments.length} comment(s) / notes` : 'Add comment / note'}
              className={cn(
                'min-w-[36px] min-h-[36px] p-2 rounded-xl transition flex items-center justify-center active:scale-95 cursor-pointer relative',
                showComments
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : allComments.length > 0
                  ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {allComments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center border border-slate-900 shadow-sm">
                  {allComments.length}
                </span>
              )}
            </button>

            {!isReplaced && onOpenReplace && (
              <button
                type="button"
                onClick={() => onOpenReplace(occurrence)}
                title="Replace activity / Adapt routine"
                className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-blue-300 hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
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

        {/* Task Steps & Checklist Section */}
        {occurrence.steps && occurrence.steps.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSteps(!showSteps)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <ListChecks className="w-3.5 h-3.5 text-blue-400" />
                <span>Checklist</span>
                <span className="text-[11px] font-normal text-slate-400">
                  ({occurrence.completedStepIds?.length || 0}/{occurrence.steps.length})
                </span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                    showSteps && 'rotate-180'
                  )}
                />
              </button>

              <div className="flex items-center gap-2">
                {occurrence.completedStepIds?.length === occurrence.steps.length && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> All Done
                  </span>
                )}
                {/* Mini Progress Bar */}
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round(
                        ((occurrence.completedStepIds?.length || 0) / occurrence.steps.length) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Expanded Steps List */}
            {showSteps && (
              <div className="space-y-1.5 pt-1">
                {occurrence.steps.map((step, idx) => {
                  const isDone = (occurrence.completedStepIds || []).includes(step.id);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onToggleStep?.(occurrence, step.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition cursor-pointer border min-h-[36px]',
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-400 hover:bg-emerald-950/30'
                          : 'bg-slate-800/40 border-white/5 text-slate-200 hover:bg-slate-800 hover:border-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                          isDone
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'border-slate-500 bg-slate-900/80 text-transparent'
                        )}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">
                        {idx + 1}.
                      </span>
                      <span
                        className={cn(
                          'text-xs flex-1',
                          isDone ? 'line-through text-slate-500 font-normal' : 'text-slate-200 font-medium'
                        )}
                      >
                        {step.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Comments & Daily Activity Notes Section */}
        <div className="mt-3 pt-2.5 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowComments(!showComments)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Comments & Notes</span>
              {allComments.length > 0 && (
                <span className="text-[10px] font-bold text-blue-300 px-1.5 py-0.2 rounded-full bg-blue-500/20 border border-blue-500/30">
                  {allComments.length}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                  showComments && 'rotate-180'
                )}
              />
            </button>

            {!showComments && (
              <button
                type="button"
                onClick={() => setShowComments(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold hover:underline cursor-pointer"
              >
                + Add Note
              </button>
            )}
          </div>

          {/* Routine Template Guidance Note (if exists on template) */}
          {occurrence.notes && !showComments && (
            <div className="text-[11px] text-slate-400 italic line-clamp-1">
              &ldquo;{occurrence.notes}&rdquo;
            </div>
          )}

          {/* Expanded Comments Container */}
          {showComments && (
            <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
              {occurrence.notes && (
                <div className="text-[11px] text-slate-300 bg-slate-800/40 border border-white/5 p-2 rounded-xl">
                  <span className="font-semibold text-slate-400 block mb-0.5">💡 Activity Notes:</span>
                  <p>{occurrence.notes}</p>
                </div>
              )}

              {/* List of Comments for this Day */}
              {allComments.length > 0 ? (
                <div className="space-y-2">
                  {allComments.map((comment) => {
                    const isEditing = editingCommentId === comment.id;
                    const dateFormatted = new Date(comment.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={comment.id}
                        className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1.5 text-xs group"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={2}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-blue-500/50 text-xs text-white focus:outline-none"
                              placeholder="Edit comment..."
                            />
                            <div className="flex items-center justify-between gap-2">
                              <VoiceInputButton
                                onTranscript={(txt) =>
                                  setEditingText((prev) => (prev ? `${prev} ${txt}` : txt))
                                }
                                size="sm"
                                title="Voice dictation for note"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-2.5 py-1 rounded text-[11px] text-slate-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!editingText.trim()) return;
                                    await onUpdateComment?.(occurrence, comment.id, editingText);
                                    setEditingCommentId(null);
                                  }}
                                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 flex-1">
                              <p className="text-slate-200 text-xs whitespace-pre-wrap leading-relaxed">
                                {comment.text}
                              </p>
                              <span className="text-[10px] text-slate-500 block">
                                {dateFormatted}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingText(comment.text);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-blue-300 hover:bg-slate-700/60 transition cursor-pointer"
                                title="Edit note"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteComment?.(occurrence, comment.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                                title="Delete note"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic py-1">
                  No comments or notes added for this activity today yet.
                </p>
              )}

              {/* Add Comment Input Form */}
              <div className="pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          handleAddCommentSubmit();
                        }
                      }}
                      rows={2}
                      placeholder="Write a comment or note for today's activity... (Ctrl+Enter to post)"
                      className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-800/90 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                    />
                    <div className="absolute right-2 bottom-2.5">
                      <VoiceInputButton
                        onTranscript={(txt) =>
                          setNewCommentText((prev) => (prev ? `${prev} ${txt}` : txt))
                        }
                        size="sm"
                        title="Voice dictation for note"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!newCommentText.trim() || isSubmittingComment}
                    onClick={handleAddCommentSubmit}
                    className="self-end sm:self-auto min-h-[38px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md shadow-blue-600/20 active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
