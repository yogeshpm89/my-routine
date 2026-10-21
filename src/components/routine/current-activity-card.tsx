'use client';

import React, { useState, useEffect } from 'react';
import { ActivityOccurrence, ActivityStatus } from '@/types/routine';
import {
  timeToMinutes,
  formatTime12Hour,
  formatDuration,
  getCurrentTimeString,
} from '@/lib/time-utils';
import { CategoryBadge } from './activity-badge';
import {
  CheckCircle2,
  Play,
  RotateCcw,
  FastForward,
  Lock,
  ArrowRight,
  Clock,
  Sparkles,
  Music,
  Video,
  ListChecks,
  Check,
  Palmtree,
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { YouTubeIcon as Youtube } from '@/components/media/youtube-icon';
import { getActivityTheme } from '@/lib/activity-styles';
import { VoiceInputButton } from './voice-input-button';
import { cn } from '@/lib/utils';

interface CurrentActivityCardProps {
  occurrences: ActivityOccurrence[];
  onUpdateStatus: (
    occurrence: ActivityOccurrence,
    status: ActivityStatus,
    actualTimes?: { actualStartTime?: string; actualEndTime?: string; actualDurationMinutes?: number }
  ) => void;
  onOpenEditor: (occurrence: ActivityOccurrence) => void;
  onPlayMedia?: (occurrence: ActivityOccurrence, mediaIndex?: number) => void;
  onExecuteAi?: (occurrence: ActivityOccurrence) => void;
  onToggleStep?: (occurrence: ActivityOccurrence, stepId: string) => void;
  onResumeRoutine?: () => void;
  onAddComment?: (occurrence: ActivityOccurrence, text: string) => Promise<void> | void;
  onUpdateComment?: (occurrence: ActivityOccurrence, commentId: string, text: string) => Promise<void> | void;
  onDeleteComment?: (occurrence: ActivityOccurrence, commentId: string) => Promise<void> | void;
}

export function CurrentActivityCard({
  occurrences,
  onUpdateStatus,
  onOpenEditor,
  onPlayMedia,
  onExecuteAi,
  onToggleStep,
  onResumeRoutine,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: CurrentActivityCardProps) {
  const [currentTime, setCurrentTime] = useState<string>('08:00');
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    const update = () => setCurrentTime(getCurrentTimeString('Asia/Kolkata'));
    update();
    const interval = setInterval(update, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const currentMinutes = timeToMinutes(currentTime);

  // Find active occurrence
  const currentOccurrence = occurrences.find((o) => {
    const startM = timeToMinutes(o.startTime);
    const endM = timeToMinutes(o.endTime);
    if (endM >= startM) {
      return currentMinutes >= startM && currentMinutes < endM;
    }
    // Midnight cross
    return currentMinutes >= startM || currentMinutes < endM;
  });

  // Find next occurrence
  const nextOccurrence = occurrences.find((o) => {
    const startM = timeToMinutes(o.startTime);
    return startM > currentMinutes;
  });

  // Calculate progress
  let progressPercent = 0;
  let remainingMinutes = 0;
  if (currentOccurrence) {
    const startM = timeToMinutes(currentOccurrence.startTime);
    const endM = timeToMinutes(currentOccurrence.endTime);
    const total = endM >= startM ? endM - startM : 1440 - startM + endM;
    const elapsed = currentMinutes >= startM ? currentMinutes - startM : 1440 - startM + currentMinutes;
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    remainingMinutes = Math.max(0, total - elapsed);
  }

  const status = currentOccurrence?.log?.status ?? 'pending';
  const isAllSkipped = occurrences.length > 0 && occurrences.every((o) => o.log?.status === 'skipped');

  // Category-specific theme styling for the current activity
  const activeTheme = currentOccurrence ? getActivityTheme(currentOccurrence.category) : null;

  const rawComments = currentOccurrence ? currentOccurrence.comments || currentOccurrence.log?.comments || [] : [];
  const allComments = currentOccurrence
    ? [
        ...rawComments,
        ...(currentOccurrence.log?.completionNotes && !rawComments.some((c) => c.text === currentOccurrence.log?.completionNotes)
          ? [{ id: `log_note_${currentOccurrence.occurrenceId}`, text: currentOccurrence.log.completionNotes, createdAt: currentOccurrence.log.updatedAt || Date.now() }]
          : []),
      ]
    : [];

  const handleAddCommentSubmit = async () => {
    if (!newCommentText.trim() || isSubmittingComment || !currentOccurrence) return;
    setIsSubmittingComment(true);
    try {
      await onAddComment?.(currentOccurrence, newCommentText.trim());
      setNewCommentText('');
      setShowComments(true);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 sm:p-6 border shadow-2xl backdrop-blur-xl transition-all duration-300',
        activeTheme
          ? cn('bg-gradient-to-br', activeTheme.cardGradient, activeTheme.borderColor)
          : 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border-white/10'
      )}
    >
      {/* Category-specific dynamic ambient background glow */}
      {activeTheme ? (
        <>
          <div
            className={cn(
              'absolute -right-20 -top-20 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700',
              activeTheme.ambientGlowA
            )}
          />
          <div
            className={cn(
              'absolute -left-20 -bottom-20 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700',
              activeTheme.ambientGlowB
            )}
          />
        </>
      ) : (
        <>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {isAllSkipped ? (
        <div className="relative z-10 py-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palmtree className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Day Off • Routine Skipped
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {formatTime12Hour(currentTime)} IST
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>Enjoy your day off!</span>
                <span className="text-lg">🌴</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                All {occurrences.length} scheduled routines for today are skipped. Take this time to rest and recharge.
              </p>
            </div>

            {onResumeRoutine && (
              <button
                type="button"
                id="btn-card-resume-routine"
                onClick={onResumeRoutine}
                className="self-start sm:self-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/25 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resume Routine</span>
              </button>
            )}
          </div>
        </div>
      ) : currentOccurrence ? (
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Current Activity
              </span>
              <span className="text-xs text-slate-400">
                ({formatTime12Hour(currentTime)} IST)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentOccurrence.isFixed && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> Fixed Block
                </span>
              )}
              <CategoryBadge category={currentOccurrence.category} size="sm" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                onClick={() => onOpenEditor(currentOccurrence)}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white hover:text-blue-300 transition-colors cursor-pointer"
              >
                {currentOccurrence.title}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-300">
                <span className="font-medium text-blue-300">
                  {formatTime12Hour(currentOccurrence.startTime)} – {formatTime12Hour(currentOccurrence.endTime)}
                </span>
                <span>•</span>
                <span>{formatDuration(currentOccurrence.durationMinutes)}</span>
                {remainingMinutes > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">
                      {remainingMinutes}m remaining
                    </span>
                  </>
                )}
              </div>

              {/* Attached Media Chips */}
              {currentOccurrence.media && currentOccurrence.media.length > 0 && (
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {currentOccurrence.media.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onPlayMedia?.(currentOccurrence, idx)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 shadow-sm transition hover:scale-[1.02]"
                      title={`Play ${item.title || item.fileName || 'media'}`}
                    >
                      {item.type === 'youtube' ? (
                        <Youtube className="w-3.5 h-3.5 text-rose-500" />
                      ) : item.type === 'audio_url' || (item.type === 'local_file' && item.mimeType?.startsWith('audio/')) ? (
                        <Music className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Video className="w-3.5 h-3.5 text-blue-400" />
                      )}
                      <span className="truncate max-w-[150px]">{item.title || item.fileName || 'Media Track'}</span>
                      <Play className="w-2.5 h-2.5 fill-current opacity-75" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Status Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentOccurrence.media && currentOccurrence.media.length > 0 && (
                <button
                  id="btn-play-current-media"
                  type="button"
                  onClick={() => onPlayMedia?.(currentOccurrence, 0)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-lg shadow-rose-900/30 transition-all active:scale-[0.98]"
                  title="Play Routine Media"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Media ({currentOccurrence.media.length})</span>
                </button>
              )}
              {status !== 'completed' ? (
                <>
                  {status !== 'in_progress' ? (
                    <button
                      id="btn-start-current"
                      onClick={() =>
                        onUpdateStatus(currentOccurrence, 'in_progress', {
                          actualStartTime: currentTime,
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" /> Start
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold text-blue-400 bg-blue-950/80 rounded-xl border border-blue-500/40 animate-pulse">
                      In Progress
                    </span>
                  )}
                  <button
                    id="btn-complete-current"
                    onClick={() =>
                      onUpdateStatus(currentOccurrence, 'completed', {
                        actualEndTime: currentTime,
                        actualDurationMinutes: currentOccurrence.durationMinutes,
                      })
                    }
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete
                  </button>
                  {status === 'skipped' ? (
                    <button
                      id="btn-unskip-current"
                      onClick={() => onUpdateStatus(currentOccurrence, 'pending')}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 transition-all cursor-pointer"
                      title="Unskip and restore activity"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Unskip
                    </button>
                  ) : (
                    <button
                      id="btn-skip-current"
                      onClick={() => onUpdateStatus(currentOccurrence, 'skipped')}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                    >
                      <FastForward className="w-3.5 h-3.5" /> Skip
                    </button>
                  )}
                  {currentOccurrence.aiActionId && (
                    <button
                      id="btn-execute-ai-current"
                      onClick={() => onExecuteAi?.(currentOccurrence)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 transition-all active:scale-[0.98] cursor-pointer"
                      title="Execute attached AI Routine Action"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Execute AI
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-4 py-2.5 min-h-[44px] rounded-xl shadow-inner">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed
                  </span>
                  <button
                    onClick={() => onUpdateStatus(currentOccurrence, 'pending')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition cursor-pointer"
                    title="Undo completion"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Undo</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 px-0.5">
              <span>{progressPercent}% elapsed</span>
              <span>{remainingMinutes}m left</span>
            </div>
          </div>

          {/* Interactive Steps Checklist while performing routine */}
          {currentOccurrence.steps && currentOccurrence.steps.length > 0 && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-white/10 space-y-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Steps Checklist
                  </span>
                  <span className="text-xs font-semibold text-blue-400">
                    ({currentOccurrence.completedStepIds?.length || 0}/{currentOccurrence.steps.length})
                  </span>
                </div>
                {currentOccurrence.completedStepIds?.length === currentOccurrence.steps.length && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> All steps completed!
                  </span>
                )}
              </div>

              {/* Progress Bar for Steps */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round(
                      ((currentOccurrence.completedStepIds?.length || 0) / currentOccurrence.steps.length) * 100
                    )}%`,
                  }}
                />
              </div>

              {/* Step items */}
              <div className="space-y-1.5 pt-1">
                {currentOccurrence.steps.map((step, idx) => {
                  const isDone = (currentOccurrence.completedStepIds || []).includes(step.id);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onToggleStep?.(currentOccurrence, step.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer min-h-[40px] ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-400 hover:bg-emerald-950/30'
                          : 'bg-slate-900/80 border-white/5 text-slate-200 hover:bg-slate-800 hover:border-white/10'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'border-slate-600 bg-slate-800 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-xs font-semibold text-slate-400 shrink-0">
                        {idx + 1}.
                      </span>
                      <span
                        className={`text-xs flex-1 ${
                          isDone ? 'line-through text-slate-500 font-normal' : 'text-slate-200 font-medium'
                        }`}
                      >
                        {step.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Routine Notes Preview if available */}
          {currentOccurrence.notes && (
            <div className="text-xs text-slate-300 italic bg-white/5 p-3 rounded-xl border border-white/5 flex items-start gap-2">
              <span className="not-italic font-bold text-slate-400">💡 Note:</span>
              <p className="flex-1">&ldquo;{currentOccurrence.notes}&rdquo;</p>
            </div>
          )}

          {/* Interactive Comments & Notes Section on Current Activity Card */}
          <div className="pt-2 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                id="btn-current-toggle-comments"
                onClick={() => setShowComments(!showComments)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Comments & Daily Notes</span>
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
                  id="btn-current-quick-add-note"
                  onClick={() => setShowComments(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>+ Add Note</span>
                </button>
              )}
            </div>

            {/* Expanded Comments Container */}
            {showComments && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                {/* List of comments for this occurrence */}
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
                          className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs group"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-blue-500/50 text-xs text-white focus:outline-none"
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
                                    className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!editingText.trim()) return;
                                      await onUpdateComment?.(currentOccurrence, comment.id, editingText);
                                      setEditingCommentId(null);
                                    }}
                                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 flex-1">
                                <p className="text-slate-100 text-xs whitespace-pre-wrap leading-relaxed">
                                  {comment.text}
                                </p>
                                <span className="text-[10px] text-slate-400 block">
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
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-slate-800 transition cursor-pointer"
                                  title="Edit note"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteComment?.(currentOccurrence, comment.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
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
                  <p className="text-xs text-slate-400 italic py-1">
                    No notes logged for this activity yet today.
                  </p>
                )}

                {/* Add Comment Input Form with Voice Dictation */}
                <div className="pt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <textarea
                        id="input-current-comment"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleAddCommentSubmit();
                          }
                        }}
                        rows={2}
                        placeholder="Write a note or comment for current routine... (Ctrl+Enter to post)"
                        className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
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
                      id="btn-current-post-comment"
                      disabled={!newCommentText.trim() || isSubmittingComment}
                      onClick={handleAddCommentSubmit}
                      className="self-end sm:self-auto min-h-[38px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md shadow-blue-600/20 active:scale-95 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Note</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Next Activity Preview */}
          {nextOccurrence && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400">Next up:</span>
                <strong className="text-slate-200">{nextOccurrence.title}</strong>
              </span>
              <span className="text-blue-400 flex items-center gap-1">
                {formatTime12Hour(nextOccurrence.startTime)}
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Empty / Buffer State */
        <div className="relative z-10 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Buffer / Transition Time
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {formatTime12Hour(currentTime)} IST
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                No active schedule block right now
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Take a moment to hydrate, breathe, or prepare for what&apos;s next.
              </p>
            </div>

            {nextOccurrence && (
              <div className="bg-slate-800/80 p-3 rounded-xl border border-white/10 text-right">
                <span className="text-[11px] text-slate-400 block">Upcoming next:</span>
                <span className="text-sm font-semibold text-blue-300 block">
                  {nextOccurrence.title}
                </span>
                <span className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-blue-400" />
                  {formatTime12Hour(nextOccurrence.startTime)} ({formatDuration(nextOccurrence.durationMinutes)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
