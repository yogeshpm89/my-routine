'use client';

import React, { useState, useEffect } from 'react';
import { LifeGoal, GoalTrackedItem } from '@/types/goals';
import { getTodayDateString } from '@/lib/time-utils';
import {
  X,
  TrendingUp,
  CheckCircle2,
  Plus,
  Minus,
  BookOpen,
  GraduationCap,
  FolderGit2,
  FileText,
  Headphones,
  Sparkles,
} from 'lucide-react';

interface LogItemProgressModalProps {
  isOpen: boolean;
  goal: LifeGoal | null;
  item: GoalTrackedItem | null;
  onClose: () => void;
  onSaveItemProgress: (
    goalId: string,
    itemId: string,
    data: {
      deltaUnits?: number;
      setAbsoluteUnits?: number;
      note?: string;
      date?: string;
      markCompleted?: boolean;
    }
  ) => Promise<void> | void;
}

export function LogItemProgressModal({
  isOpen,
  goal,
  item,
  onClose,
  onSaveItemProgress,
}: LogItemProgressModalProps) {
  const [mode, setMode] = useState<'incremental' | 'absolute'>('incremental');
  const [deltaUnits, setDeltaUnits] = useState<number>(10);
  const [absoluteUnits, setAbsoluteUnits] = useState<number>(0);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayDateString('Asia/Kolkata'));
  const [markCompleted, setMarkCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setAbsoluteUnits(item.currentUnits);
      // Smart default delta based on unit label
      const unit = (item.unitLabel || '').toLowerCase();
      if (unit.includes('page')) {
        setDeltaUnits(10);
      } else if (unit.includes('min')) {
        setDeltaUnits(15);
      } else if (unit.includes('mod') || unit.includes('chap') || unit.includes('less') || unit.includes('top')) {
        setDeltaUnits(1);
      } else {
        setDeltaUnits(1);
      }
      setMarkCompleted(item.status === 'completed');
      setNote('');
      setDate(getTodayDateString('Asia/Kolkata'));
      setMode('incremental');
    }
  }, [item, isOpen]);

  if (!isOpen || !goal || !item) return null;

  const unit = item.unitLabel || 'units';
  const total = item.totalUnits || 0;
  const current = item.currentUnits || 0;

  const projectedCurrent =
    mode === 'incremental'
      ? Math.max(0, Number((current + deltaUnits).toFixed(2)))
      : Math.max(0, Number(absoluteUnits.toFixed(2)));

  const projectedPercent =
    total > 0 ? Math.min(100, Math.round((projectedCurrent / total) * 100)) : 0;
  const willComplete = total > 0 && projectedCurrent >= total;

  const getItemIcon = () => {
    switch (item.itemType) {
      case 'book':
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case 'course':
        return <GraduationCap className="w-4 h-4 text-blue-400" />;
      case 'project':
        return <FolderGit2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-amber-400" />;
    }
  };

  const getPresetValues = (): number[] => {
    if (item.quickIncrements && item.quickIncrements.length > 0) {
      return item.quickIncrements;
    }
    const u = unit.toLowerCase();
    if (u.includes('page')) return [5, 10, 20, 25, 50];
    if (u.includes('min')) return [5, 10, 15, 30, 45];
    if (u.includes('mod') || u.includes('chap') || u.includes('less') || u.includes('top')) {
      return [1, 2, 3, 5];
    }
    return [1, 5, 10, 20];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'incremental') {
        await onSaveItemProgress(goal.id, item.id, {
          deltaUnits,
          note,
          date,
          markCompleted: markCompleted || willComplete,
        });
      } else {
        await onSaveItemProgress(goal.id, item.id, {
          setAbsoluteUnits: absoluteUnits,
          note,
          date,
          markCompleted: markCompleted || willComplete,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 text-white">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 border border-white/5">
              {getItemIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate max-w-[240px]">
                  {item.title}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                {goal.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-slate-950/80 p-1 border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => setMode('incremental')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              mode === 'incremental'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            + Add Progress ({unit})
          </button>
          <button
            type="button"
            onClick={() => setMode('absolute')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              mode === 'absolute'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Set Current Total ({unit})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Progress Visual Preview */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Projected Progress</span>
              <span className="font-bold text-white">
                {current} → <span className="text-emerald-400 font-extrabold">{projectedCurrent}</span>
                {total > 0 && ` / ${total}`} {unit}
              </span>
            </div>
            {total > 0 && (
              <>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${projectedPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{projectedPercent}% completed</span>
                  {projectedCurrent < total && (
                    <span className="text-slate-400">
                      {Math.max(0, total - projectedCurrent)} {unit} remaining
                    </span>
                  )}
                  {willComplete && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready to complete!
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Stepper & Input */}
          {mode === 'incremental' ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Progress Increment Amount ({unit})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeltaUnits((prev) => Math.max(1, prev - 1))}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={deltaUnits}
                    onChange={(e) => setDeltaUnits(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-center text-base font-bold rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                    {unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeltaUnits((prev) => prev + 1)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 font-medium mr-1">Presets:</span>
                {getPresetValues().map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDeltaUnits(val)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer border ${
                      deltaUnits === val
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-slate-800/80 border-white/5 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Total Current Units Completed
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={total > 0 ? total : undefined}
                  step="any"
                  value={absoluteUnits}
                  onChange={(e) => setAbsoluteUnits(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-center text-base font-bold rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                  / {total > 0 ? `${total} ` : ''}{unit}
                </span>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Reflection / Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Progress Note / Takeaway (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`e.g. Read chapters 3 & 4; key insights on time-blocking`}
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Mark Complete Checkbox */}
          <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 border border-white/5 cursor-pointer hover:bg-slate-800/60 transition">
            <input
              type="checkbox"
              checked={markCompleted || willComplete}
              onChange={(e) => setMarkCompleted(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-white/20"
            />
            <span className="text-xs text-slate-300 select-none">
              Mark {item.title} as completed
            </span>
          </label>

          {/* Modal Actions */}
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
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Progress'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
