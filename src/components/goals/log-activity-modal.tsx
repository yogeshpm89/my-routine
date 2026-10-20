'use client';

import React, { useState } from 'react';
import { LifeGoal } from '@/types/goals';
import { RoutineTemplate } from '@/types/routine';
import { getTodayDateString } from '@/lib/time-utils';
import { X, Clock, Calendar, Activity, CheckCircle2, Plus } from 'lucide-react';

interface LogActivityModalProps {
  isOpen: boolean;
  goal: LifeGoal | null;
  templates?: RoutineTemplate[];
  onClose: () => void;
  onRecordActivity: (data: {
    date: string;
    activityTitle: string;
    durationMinutes: number;
    notes: string;
    templateId?: string;
    incrementProgress: boolean;
  }) => Promise<void> | void;
}

export function LogActivityModal({
  isOpen,
  goal,
  templates = [],
  onClose,
  onRecordActivity,
}: LogActivityModalProps) {
  const today = getTodayDateString('Asia/Kolkata');

  const [date, setDate] = useState(today);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [activityTitle, setActivityTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [incrementProgress, setIncrementProgress] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize title from linked template if available
  React.useEffect(() => {
    if (goal) {
      setDate(today);
      const linked = (goal.linkedTemplateIds || [])
        .map((id) => templates.find((t) => t.id === id))
        .filter(Boolean) as RoutineTemplate[];

      if (linked.length > 0) {
        setSelectedTemplateId(linked[0].id);
        setActivityTitle(linked[0].title);
      } else {
        setSelectedTemplateId('');
        setActivityTitle(goal.title);
      }
      setDurationMinutes(30);
      setNotes('');
      setIncrementProgress(true);
    }
  }, [goal, templates, isOpen, today]);

  if (!isOpen || !goal) return null;

  const linkedTemplates = (goal.linkedTemplateIds || [])
    .map((id) => templates.find((t) => t.id === id))
    .filter(Boolean) as RoutineTemplate[];

  const handleTemplateSelect = (tId: string) => {
    setSelectedTemplateId(tId);
    if (tId) {
      const match = templates.find((t) => t.id === tId);
      if (match) {
        setActivityTitle(match.title);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onRecordActivity({
        date,
        activityTitle: activityTitle.trim(),
        durationMinutes: Number(durationMinutes) || 0,
        notes: notes.trim(),
        templateId: selectedTemplateId || undefined,
        incrementProgress,
      });
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Record Daily Activity Session
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">
                {goal.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Linked Template quick selector (if goal is linked to routines) */}
          {linkedTemplates.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Linked Daily Routine
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Custom Activity Name --</option>
                {linkedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    Routine: {t.title} ({t.startTime} - {t.endTime})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Activity Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Activity / Routine Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
              placeholder="e.g. Evening Reading, Outdoor Cycling, Deep Work AI Sprint"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 font-medium"
              required
            />
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Activity Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 font-bold"
                required
              />
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {[15, 30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDurationMinutes(mins)}
                className={`px-2 py-1 text-[11px] rounded-lg border transition ${
                  durationMinutes === mins
                    ? 'bg-blue-600 border-blue-500 text-white font-bold'
                    : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Activity Notes / Comments */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Activity Notes & Reflections
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Read 25 pages of Deep Work, or 18 km cycling high-cadence loop"
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Auto increment checkbox */}
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-white/5 cursor-pointer">
            <input
              type="checkbox"
              checked={incrementProgress}
              onChange={(e) => setIncrementProgress(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="text-xs text-slate-300 select-none">
              Increment goal progress metric (+1 {goal.unit || 'unit'})
            </span>
          </label>

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
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
