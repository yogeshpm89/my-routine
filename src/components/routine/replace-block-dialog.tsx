'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityOccurrence,
  ActivityCategory,
  RoutineTemplate,
  EditScope,
} from '@/types/routine';
import { LifeGoal } from '@/types/goals';
import { DayRoutineTemplate } from '@/types/routine-templates';
import {
  calculateDuration,
  formatDuration,
  formatTime12Hour,
  isTimeOverlapping,
} from '@/lib/time-utils';
import { CategoryBadge, CATEGORY_CONFIG } from './activity-badge';
import {
  X,
  ArrowLeftRight,
  Clock,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Target,
  Library,
  PlusCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReplaceBlockDialogProps {
  isOpen: boolean;
  occurrence: ActivityOccurrence | null;
  selectedDate: string;
  allOccurrences: ActivityOccurrence[];
  routineTemplates: RoutineTemplate[];
  dayTemplates?: DayRoutineTemplate[];
  lifeGoals?: LifeGoal[];
  onConfirmReplacement: (data: {
    originalOccurrence: ActivityOccurrence;
    replacement: {
      title: string;
      category: ActivityCategory;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      reason?: string;
      linkedGoalId?: string;
      isTemporary: boolean;
      color?: string;
    };
    partialDurationMinutes?: number;
    rescheduleOriginal?: {
      date: string;
      startTime: string;
      endTime: string;
    };
    scope: EditScope;
  }) => Promise<void> | void;
  onClose: () => void;
}

const PRESET_REASONS = [
  '🚨 Urgent Priority',
  '📅 Unscheduled Meeting',
  '🏥 Health / Medical',
  '👨‍👩‍👧 Family Responsibility',
  '⚡ Priority Shift',
  '🚗 Travel / Commute',
];

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#64748b', // slate
];

export function ReplaceBlockDialog({
  isOpen,
  occurrence,
  selectedDate,
  allOccurrences,
  routineTemplates,
  dayTemplates = [],
  lifeGoals = [],
  onConfirmReplacement,
  onClose,
}: ReplaceBlockDialogProps) {
  const [sourceTab, setSourceTab] = useState<'library' | 'temporary'>('library');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('work');
  const [color, setColor] = useState('#06b6d4');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [linkedGoalId, setLinkedGoalId] = useState<string>('');

  // Partial work on original
  const [hasPartialWork, setHasPartialWork] = useState(false);
  const [partialMinutes, setPartialMinutes] = useState<number>(0);

  // Reschedule original
  const [actionType, setActionType] = useState<'replace_only' | 'reschedule'>('replace_only');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('18:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('19:00');

  // Recurrence scope
  const [scope, setScope] = useState<EditScope>('this_occurrence');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize values when occurrence changes
  useEffect(() => {
    if (occurrence) {
      setStartTime(occurrence.startTime);
      setEndTime(occurrence.endTime);
      setCustomTitle('');
      setReason('');
      setLinkedGoalId('');
      setHasPartialWork(false);
      setPartialMinutes(0);
      setActionType('replace_only');
      setRescheduleStartTime(occurrence.endTime);
      const reschedEnd = occurrence.endTime;
      const [h, m] = reschedEnd.split(':').map(Number);
      const newH = (h + 1) % 24;
      setRescheduleEndTime(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      setScope('this_occurrence');
      setError(null);

      // Default library selection to first available other routine
      const otherTemplates = routineTemplates.filter((t) => t.id !== occurrence.templateId && !t.isArchived);
      if (otherTemplates.length > 0) {
        setSelectedTemplateId(otherTemplates[0].id);
        setCategory(otherTemplates[0].category);
        setColor(otherTemplates[0].color || '#06b6d4');
        setSourceTab('library');
      } else {
        setSourceTab('temporary');
        setCategory('work');
        setColor('#06b6d4');
      }
    }
  }, [occurrence, routineTemplates]);

  // Handle template selection change
  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = routineTemplates.find((t) => t.id === tmplId);
    if (tmpl) {
      setCategory(tmpl.category);
      setColor(tmpl.color || '#06b6d4');
    }
  };

  const durationMinutes = calculateDuration(startTime, endTime);
  const originalDuration = occurrence?.durationMinutes || 0;

  // Active replacement title
  const activeTitle =
    sourceTab === 'library'
      ? routineTemplates.find((t) => t.id === selectedTemplateId)?.title || ''
      : customTitle.trim();

  // Schedule conflict detection for replacement time slot
  const conflicts = useMemo(() => {
    if (!occurrence || !startTime || !endTime || durationMinutes <= 0) return [];
    return allOccurrences.filter((o) => {
      // Exclude the current occurrence being replaced
      if (o.occurrenceId === occurrence.occurrenceId || o.templateId === occurrence.templateId) {
        return false;
      }
      if (o.isCancelled || o.log?.status === 'replaced') return false;
      return isTimeOverlapping(startTime, endTime, o.startTime, o.endTime);
    });
  }, [occurrence, startTime, endTime, durationMinutes, allOccurrences]);

  // Conflict detection for rescheduled slot (if applicable)
  const rescheduleConflicts = useMemo(() => {
    if (actionType !== 'reschedule' || !occurrence) return [];
    return allOccurrences.filter((o) => {
      if (o.occurrenceId === occurrence.occurrenceId) return false;
      if (o.isCancelled || o.log?.status === 'replaced') return false;
      return isTimeOverlapping(rescheduleStartTime, rescheduleEndTime, o.startTime, o.endTime);
    });
  }, [actionType, occurrence, rescheduleStartTime, rescheduleEndTime, allOccurrences]);

  if (!isOpen || !occurrence) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activeTitle) {
      setError(
        sourceTab === 'library'
          ? 'Please select an activity from your library.'
          : 'Please enter a title for the temporary activity.'
      );
      return;
    }

    if (durationMinutes <= 0) {
      setError('Replacement end time must be after start time.');
      return;
    }

    if (hasPartialWork && (partialMinutes < 0 || partialMinutes >= originalDuration)) {
      setError(`Partial minutes must be between 1 and ${originalDuration - 1} minutes.`);
      return;
    }

    if (actionType === 'reschedule') {
      const reschedDuration = calculateDuration(rescheduleStartTime, rescheduleEndTime);
      if (reschedDuration <= 0) {
        setError('Rescheduled end time must be after start time.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onConfirmReplacement({
        originalOccurrence: occurrence,
        replacement: {
          title: activeTitle,
          category,
          startTime,
          endTime,
          durationMinutes,
          reason: reason.trim() || undefined,
          linkedGoalId: linkedGoalId || undefined,
          isTemporary: sourceTab === 'temporary',
          color,
        },
        partialDurationMinutes: hasPartialWork && partialMinutes > 0 ? partialMinutes : undefined,
        rescheduleOriginal:
          actionType === 'reschedule'
            ? {
                date: selectedDate,
                startTime: rescheduleStartTime,
                endTime: rescheduleEndTime,
              }
            : undefined,
        scope,
      });
      onClose();
    } catch (err: unknown) {
      console.error('Failed to replace routine block:', err);
      setError(err instanceof Error ? err.message : 'Failed to replace routine block.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-2xl bg-slate-900 border-t sm:border border-white/10 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 sm:px-6 py-4 shrink-0 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Adapt Schedule & Replace Block
              </h2>
              <p className="text-xs text-slate-400">
                Replace planned routine without deleting historical progress
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Planned Block Context Card */}
          <div className="rounded-2xl p-4 bg-slate-950/70 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-blue-400 font-bold">
                <Calendar className="w-3.5 h-3.5" /> Planned Routine Block
              </span>
              <CategoryBadge category={occurrence.category} size="sm" />
            </div>
            <div className="flex items-start justify-between gap-3 pt-1">
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {occurrence.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {formatTime12Hour(occurrence.startTime)} – {formatTime12Hour(occurrence.endTime)}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span>{formatDuration(occurrence.durationMinutes)}</span>
                </div>
              </div>
              {occurrence.isFixed && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                  <Lock className="w-3 h-3" /> Fixed
                </span>
              )}
            </div>
          </div>

          {/* Replacement Activity Source Tabs */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Choose Replacement Activity</span>
              <span className="text-[11px] text-slate-400 font-normal">What are you doing instead?</span>
            </label>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setSourceTab('library')}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2',
                  sourceTab === 'library'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Library className="w-3.5 h-3.5" />
                <span>From Routine Library</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceTab('temporary')}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2',
                  sourceTab === 'temporary'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Temporary Activity</span>
              </button>
            </div>

            {sourceTab === 'library' ? (
              <div className="space-y-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {routineTemplates
                    .filter((t) => t.id !== occurrence.templateId && !t.isArchived)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({CATEGORY_CONFIG[t.category]?.label || t.category})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 italic">
                  Select an existing activity from your routine library to substitute for today.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Urgent Client Issue, Doctor Appointment, Flight Delay"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Temporary activities only run today and won't clutter your recurring routine templates.
                  </p>
                </div>

                {/* Category & Color Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Activity Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                    >
                      {Object.keys(CATEGORY_CONFIG).map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_CONFIG[cat as ActivityCategory]?.label || cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-1.5 pt-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          style={{ backgroundColor: c }}
                          className={cn(
                            'w-5 h-5 rounded-full transition-transform',
                            color === c && 'ring-2 ring-white scale-110'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Time Slot & Duration Controls */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Time Slot & Duration</span>
              <span className="text-xs text-blue-400 font-semibold">{formatDuration(durationMinutes)}</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Overlap & Conflict Warning Banner */}
            {conflicts.length > 0 && (
              <div className="p-3 bg-amber-950/70 border border-amber-500/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Time Conflict Detected ({conflicts.length} overlap)</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  This replacement time overlaps with{' '}
                  <span className="font-semibold">
                    {conflicts.map((c) => `"${c.title}" (${formatTime12Hour(c.startTime)}–${formatTime12Hour(c.endTime)})`).join(', ')}
                  </span>
                  . Adjust start/end time or resolve after saving.
                </p>
              </div>
            )}
          </div>

          {/* Partial Work Completed on Original Block */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-white/10 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasPartialWork}
                onChange={(e) => {
                  setHasPartialWork(e.target.checked);
                  if (e.target.checked && partialMinutes === 0) {
                    setPartialMinutes(Math.min(15, Math.floor(originalDuration / 2)));
                  }
                }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-white/20"
              />
              <span className="text-xs font-semibold text-slate-200">
                I already started / completed partial work on &quot;{occurrence.title}&quot;
              </span>
            </label>

            {hasPartialWork && (
              <div className="pl-6 space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={originalDuration - 1}
                    value={partialMinutes || ''}
                    onChange={(e) => setPartialMinutes(Number(e.target.value))}
                    className="w-24 bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-400">
                    minutes completed out of {originalDuration}m planned
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400/90 leading-tight">
                  ✓ {partialMinutes} minutes will be logged for &quot;{occurrence.title}&quot; and its linked Life Goal. The remaining duration is allocated to the replacement task.
                </p>
              </div>
            )}
          </div>

          {/* Handling of Original Activity: Replace vs Reschedule */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Disposition of &quot;{occurrence.title}&quot;
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('replace_only')}
                className={cn(
                  'p-3 rounded-xl border text-left transition flex flex-col justify-between',
                  actionType === 'replace_only'
                    ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/40 text-white'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:text-white'
                )}
              >
                <div className="font-semibold text-xs text-white">Mark Replaced for Today</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Skip remainder for today; preserve history and resume on next scheduled day.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActionType('reschedule')}
                className={cn(
                  'p-3 rounded-xl border text-left transition flex flex-col justify-between',
                  actionType === 'reschedule'
                    ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/40 text-white'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:text-white'
                )}
              >
                <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Reschedule Later Today</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Move &quot;{occurrence.title}&quot; to another available time slot later today.
                </div>
              </button>
            </div>

            {actionType === 'reschedule' && (
              <div className="p-3.5 bg-slate-950/70 border border-blue-500/30 rounded-xl space-y-2 mt-2">
                <label className="text-xs font-semibold text-blue-300 block">
                  Reschedule &quot;{occurrence.title}&quot; Time Slot
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">New Start Time</label>
                    <input
                      type="time"
                      value={rescheduleStartTime}
                      onChange={(e) => setRescheduleStartTime(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">New End Time</label>
                    <input
                      type="time"
                      value={rescheduleEndTime}
                      onChange={(e) => setRescheduleEndTime(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {rescheduleConflicts.length > 0 && (
                  <p className="text-[11px] text-amber-300 leading-tight">
                    ⚠️ Rescheduled time slot overlaps with {rescheduleConflicts.map((c) => `"${c.title}"`).join(', ')}.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reason for Replacement (Optional) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Reason for Replacement (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-lg border transition',
                    reason === preset
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800/80 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Production server outage, Client emergency, Visiting doctor"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Life Goal Association for Replacement */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span>Link Replacement to Life Goal (Optional)</span>
            </label>
            <select
              value={linkedGoalId}
              onChange={(e) => setLinkedGoalId(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None / Standalone Routine Activity</option>
              {lifeGoals
                .filter((g) => g.status !== 'archived')
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    🎯 {g.title} ({g.domain})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-400">
              The replacement activity will only credit progress to this selected goal. Original routine goals are never affected.
            </p>
          </div>

          {/* Scope Selector */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-white/10 space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Recurrence Scope
            </label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="replace_scope"
                  value="this_occurrence"
                  checked={scope === 'this_occurrence'}
                  onChange={() => setScope('this_occurrence')}
                  className="text-blue-600 focus:ring-blue-500 bg-slate-800"
                />
                <span className="font-semibold">Only today ({selectedDate})</span>
                <span className="text-slate-400 text-[11px]">(Recommended — preserves future routine)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="replace_scope"
                  value="future_occurrences"
                  checked={scope === 'future_occurrences'}
                  onChange={() => setScope('future_occurrences')}
                  className="text-blue-600 focus:ring-blue-500 bg-slate-800"
                />
                <span>This and future occurrences</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="replace_scope"
                  value="all_occurrences"
                  checked={scope === 'all_occurrences'}
                  onChange={() => setScope('all_occurrences')}
                  className="text-blue-600 focus:ring-blue-500 bg-slate-800"
                />
                <span>Update recurring routine template permanently</span>
              </label>
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 sm:px-6 py-4 shrink-0 bg-slate-900/95 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !activeTitle || durationMinutes <= 0}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Applying Replacement...' : 'Confirm Replacement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
