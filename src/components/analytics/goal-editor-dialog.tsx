'use client';

import React, { useState, useEffect } from 'react';
import { GoalTarget, ActivityCategory } from '@/types/routine';
import { CATEGORY_CONFIG, CategoryBadge } from '@/components/routine/activity-badge';
import { formatDuration } from '@/lib/time-utils';
import { X, Target, Clock, Calendar, Trash2, CheckCircle2 } from 'lucide-react';

interface GoalEditorDialogProps {
  isOpen: boolean;
  userId: string;
  initialGoal?: GoalTarget | null;
  onSave: (goal: GoalTarget) => void;
  onDelete?: (goalId: string) => void;
  onClose: () => void;
}

const ALL_CATEGORIES: ActivityCategory[] = [
  'work',
  'mindfulness',
  'learning',
  'family',
  'health',
  'business',
  'fitness',
  'rest',
  'personal',
  'buffer',
  'other',
];

export function GoalEditorDialog({
  isOpen,
  userId,
  initialGoal,
  onSave,
  onDelete,
  onClose,
}: GoalEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [targetHours, setTargetHours] = useState('2');
  const [targetMinutesRemainder, setTargetMinutesRemainder] = useState('0');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['work']);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialGoal) {
      setTitle(initialGoal.title);
      setFrequency(initialGoal.frequency);
      const totalMinutes = initialGoal.targetMinutes || 60;
      setTargetHours(Math.floor(totalMinutes / 60).toString());
      setTargetMinutesRemainder((totalMinutes % 60).toString());
      setSelectedCategories(initialGoal.categories.length > 0 ? initialGoal.categories : ['work']);
    } else {
      setTitle('');
      setFrequency('daily');
      setTargetHours('1');
      setTargetMinutesRemainder('30');
      setSelectedCategories(['work']);
    }
    setError(null);
  }, [initialGoal, isOpen]);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return; // Keep at least one
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Please provide a goal title.');
      return;
    }

    const totalMinutes = (parseInt(targetHours, 10) || 0) * 60 + (parseInt(targetMinutesRemainder, 10) || 0);
    if (totalMinutes <= 0) {
      setError('Target time must be at least 1 minute.');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Please select at least one activity category to track.');
      return;
    }

    const goalToSave: GoalTarget = {
      id: initialGoal?.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: cleanTitle,
      categories: selectedCategories,
      templateIds: initialGoal?.templateIds || [],
      frequency,
      targetMinutes: totalMinutes,
      activeDays: initialGoal?.activeDays || [0, 1, 2, 3, 4, 5, 6],
      isArchived: false,
      updatedAt: Date.now(),
    };

    onSave(goalToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {initialGoal ? 'Edit Routine Goal Target' : 'Create New Goal Target'}
              </h2>
              <p className="text-xs text-slate-400">
                Real-time Firebase synced habit and time allocation target
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Goal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep Work Focus, Daily Exercise, Reading"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Frequency Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Cadence</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency('daily')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold border transition active:scale-95 flex items-center justify-center ${
                    frequency === 'daily'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                      : 'bg-slate-800/80 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  Daily Target
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('weekly')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold border transition active:scale-95 flex items-center justify-center ${
                    frequency === 'weekly'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                      : 'bg-slate-800/80 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  Weekly Cumulative
                </button>
              </div>
            </div>

            {/* Target Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Target Duration {frequency === 'daily' ? 'Per Day' : 'Per Week'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={targetMinutesRemainder}
                    onChange={(e) => setTargetMinutesRemainder(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Categories to track */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Tracked Activity Categories
              </label>
              <p className="text-[11px] text-slate-400">
                Activities matching any selected category will automatically count toward this goal.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ALL_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer active:scale-95 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 border-white/5 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {CATEGORY_CONFIG[cat]?.label || cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-md px-5 sm:px-6 py-3.5 border-t border-white/10 flex items-center justify-between gap-3 pb-safe shrink-0">
            {initialGoal && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete goal target "${initialGoal.title}"?`)) {
                    onDelete(initialGoal.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save to Cloud</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
