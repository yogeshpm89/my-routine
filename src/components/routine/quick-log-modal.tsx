'use client';

import React, { useState } from 'react';
import { ActivityOccurrence, ActivityStatus } from '@/types/routine';
import { calculateDuration, formatDuration } from '@/lib/time-utils';
import { X, CheckCircle2 } from 'lucide-react';

interface QuickLogModalProps {
  isOpen: boolean;
  occurrence: ActivityOccurrence | null;
  onSave: (
    occurrence: ActivityOccurrence,
    status: ActivityStatus,
    extra: {
      actualStartTime?: string;
      actualEndTime?: string;
      actualDurationMinutes: number;
      completionNotes: string;
    }
  ) => void;
  onClose: () => void;
}

export function QuickLogModal({
  isOpen,
  occurrence,
  onSave,
  onClose,
}: QuickLogModalProps) {
  const [status, setStatus] = useState<ActivityStatus>(
    occurrence?.log?.status || 'completed'
  );
  const [actualStartTime, setActualStartTime] = useState(
    occurrence?.log?.actualStartTime || occurrence?.startTime || '09:00'
  );
  const [actualEndTime, setActualEndTime] = useState(
    occurrence?.log?.actualEndTime || occurrence?.endTime || '10:00'
  );
  const [notes, setNotes] = useState(occurrence?.log?.completionNotes || '');

  if (!isOpen || !occurrence) return null;

  const duration = calculateDuration(actualStartTime, actualEndTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(occurrence, status, {
      actualStartTime,
      actualEndTime,
      actualDurationMinutes: duration,
      completionNotes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 pb-safe">
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Log Activity Execution
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Record actual execution for <strong className="text-blue-300">{occurrence.title}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-white min-w-[44px] min-h-[44px] p-2 rounded-xl transition flex items-center justify-center active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Outcome Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'completed', label: 'Completed' },
                { id: 'partial', label: 'Partial' },
                { id: 'skipped', label: 'Skipped' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setStatus(s.id as ActivityStatus)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border text-center transition active:scale-95 flex items-center justify-center ${
                    status === s.id
                      ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-md'
                      : 'bg-slate-800/80 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Actual Start
              </label>
              <input
                type="time"
                value={actualStartTime}
                onChange={(e) => setActualStartTime(e.target.value)}
                className="w-full min-h-[42px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Actual End
              </label>
              <input
                type="time"
                value={actualEndTime}
                onChange={(e) => setActualEndTime(e.target.value)}
                className="w-full min-h-[42px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
              />
            </div>
            <div className="col-span-2 text-right text-xs text-slate-400">
              Total Actual: <strong className="text-emerald-400">{formatDuration(duration)}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Notes & Reflection
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What went well? Any distractions or insights?"
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition active:scale-95 flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition shadow-lg shadow-emerald-600/30 cursor-pointer justify-center"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
