'use client';

import React, { useState } from 'react';
import { ActivityOccurrence } from '@/types/routine';
import {
  CalendarX,
  Archive,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface OccurrenceDeleteScopeDialogProps {
  isOpen: boolean;
  occurrence: ActivityOccurrence | null;
  onCancelOccurrence: (occurrence: ActivityOccurrence) => Promise<void>;
  onArchiveRoutine: (occurrence: ActivityOccurrence) => Promise<void>;
  onClose: () => void;
}

export function OccurrenceDeleteScopeDialog({
  isOpen,
  occurrence,
  onCancelOccurrence,
  onArchiveRoutine,
  onClose,
}: OccurrenceDeleteScopeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'cancel_occurrence' | 'archive_routine' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !occurrence) return null;

  const isOneTime = occurrence.template.recurrence.frequency === 'once';

  const handleCancelAction = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionType('cancel_occurrence');
    setErrorMessage(null);
    try {
      await onCancelOccurrence(occurrence);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to cancel occurrence:', err);
      const message = err instanceof Error ? err.message : 'Failed to cancel occurrence. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  const handleArchiveAction = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionType('archive_routine');
    setErrorMessage(null);
    try {
      await onArchiveRoutine(occurrence);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to archive routine:', err);
      const message = err instanceof Error ? err.message : 'Failed to archive routine. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 mt-0.5 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-dialog-title" className="text-lg font-bold text-white tracking-tight">
                {isOneTime ? 'Remove Activity' : 'Manage Recurring Routine'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose how you want to handle{' '}
                <strong className="text-blue-300 font-semibold">{occurrence.title}</strong> on{' '}
                <span className="text-slate-200 font-medium">{occurrence.date}</span>:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
          {/* Option 1: Cancel this occurrence only */}
          <button
            type="button"
            id="btn-cancel-occurrence-only"
            disabled={isSubmitting}
            onClick={handleCancelAction}
            className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-rose-950/30 hover:border-rose-500/40 text-left transition group cursor-pointer disabled:opacity-50"
          >
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition shrink-0">
              {actionType === 'cancel_occurrence' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CalendarX className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-rose-200 transition">
                {isOneTime ? 'Cancel this activity' : 'Cancel this occurrence only'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {isOneTime
                  ? `Cancels this single activity on ${occurrence.date} without losing historical completion tracking.`
                  : `Cancels or skips this activity on ${occurrence.date} only. Leaves the master recurring routine active for all other dates.`}
              </div>
            </div>
          </button>

          {/* Option 2: Archive entire routine */}
          <button
            type="button"
            id="btn-archive-entire-routine"
            disabled={isSubmitting}
            onClick={handleArchiveAction}
            className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-amber-950/30 hover:border-amber-500/40 text-left transition group cursor-pointer disabled:opacity-50"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition shrink-0">
              {actionType === 'archive_routine' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Archive className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-amber-200 transition">
                Archive entire routine
              </div>
              <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Stops generating future occurrences while preserving all historical completed activities, calendar entries, and analytics.
              </div>
            </div>
          </button>
        </div>

        {/* Footer / Option 3: Keep routine */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[11px] text-slate-500">
            {occurrence.template.timezone || 'Asia/Kolkata'}
          </span>
          <button
            type="button"
            id="btn-keep-routine"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-white/5 transition cursor-pointer disabled:opacity-50"
          >
            Keep routine
          </button>
        </div>
      </div>
    </div>
  );
}
