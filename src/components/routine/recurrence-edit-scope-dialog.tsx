'use client';

import React from 'react';
import { EditScope } from '@/types/routine';
import { Calendar, FastForward, Repeat, X } from 'lucide-react';

interface RecurrenceEditScopeDialogProps {
  isOpen: boolean;
  activityTitle: string;
  date: string;
  onSelectScope: (scope: EditScope) => void;
  onCancel: () => void;
}

export function RecurrenceEditScopeDialog({
  isOpen,
  activityTitle,
  date,
  onSelectScope,
  onCancel,
}: RecurrenceEditScopeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Edit Recurring Routine
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              How would you like to apply your edits to{' '}
              <strong className="text-blue-300">{activityTitle}</strong> on {date}?
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onSelectScope('this_occurrence')}
            className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-blue-600/20 hover:border-blue-500/50 text-left transition group"
          >
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Only this occurrence
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Creates an exception for {date} without altering other days or the recurring template.
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectScope('future_occurrences')}
            className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-indigo-600/20 hover:border-indigo-500/50 text-left transition group"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition">
              <FastForward className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                This and all future occurrences
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Preserves historical records before {date} and applies your new schedule starting today onwards.
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectScope('all_occurrences')}
            className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-emerald-600/20 hover:border-emerald-500/50 text-left transition group"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                All occurrences (Recurring template)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Modifies the master template definition across all past and future days.
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
