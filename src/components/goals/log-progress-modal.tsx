'use client';

import React, { useState } from 'react';
import { LifeGoal } from '@/types/goals';
import { getTodayDateString } from '@/lib/time-utils';
import { X, TrendingUp, CheckCircle2, Plus, Minus } from 'lucide-react';

interface LogProgressModalProps {
  isOpen: boolean;
  goal: LifeGoal | null;
  onClose: () => void;
  onSaveProgress: (goalId: string, valueChange: number, note: string, date: string) => Promise<void> | void;
}

export function LogProgressModal({
  isOpen,
  goal,
  onClose,
  onSaveProgress,
}: LogProgressModalProps) {
  const [valueChange, setValueChange] = useState<number>(1);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayDateString('Asia/Kolkata'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !goal) return null;

  const isDecrement = goal.metricType === 'decrement';
  const projectedCurrent = Math.max(0, Number((goal.currentValue + valueChange).toFixed(2)));
  const progressPercent = Math.min(100, Math.round((projectedCurrent / goal.targetValue) * 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valueChange === 0 && !note.trim()) return;
    setIsSubmitting(true);
    try {
      await onSaveProgress(goal.id, valueChange, note, date);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 text-white">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Log Progress
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">
                {goal.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Progress Visual Preview */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Current Progress</span>
              <span className="font-bold text-white">
                {goal.currentValue} → <span className="text-emerald-400">{projectedCurrent}</span> / {goal.targetValue} {goal.unit}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{progressPercent}% target achieved</span>
              {projectedCurrent >= goal.targetValue && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Goal Accomplished!
                </span>
              )}
            </div>
          </div>

          {/* Quick Increment Controls */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isDecrement ? 'Progress Increment (Amount Lost / Reduced)' : 'Progress Increment (Amount Achieved)'}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setValueChange((prev) => Math.max(0.1, Number((prev - (isDecrement ? 0.5 : 1)).toFixed(1))))}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  step={isDecrement ? '0.1' : '1'}
                  value={valueChange}
                  onChange={(e) => setValueChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-center text-sm font-bold rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                  {goal.unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setValueChange((prev) => Number((prev + (isDecrement ? 0.5 : 1)).toFixed(1)))}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Entry Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Note / Reflection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Progress Note / Reflection (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Finished chapter 10 of Atomic Habits, or morning weigh-in check"
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
