'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  CalendarRange,
  CalendarDays,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { getTodayDateString, addDays } from '@/lib/time-utils';

interface ApplyTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: DayRoutineTemplate | null;
  planner: WeeklyPlannerConfig;
  onApplyToday: (templateId: string) => Promise<void> | void;
  onApplyDateRange: (templateId: string, startDate: string, endDate: string) => Promise<void> | void;
  onAssignDaysOfWeek: (templateId: string, days: number[]) => Promise<void> | void;
  onSetAsDefault: (templateId: string) => Promise<void> | void;
}

type ApplyScope = 'today' | 'range' | 'weekdays' | 'default';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

export function ApplyTemplateDialog({
  isOpen,
  onClose,
  template,
  planner,
  onApplyToday,
  onApplyDateRange,
  onAssignDaysOfWeek,
  onSetAsDefault,
}: ApplyTemplateDialogProps) {
  const today = getTodayDateString('Asia/Kolkata');
  const [scope, setScope] = useState<ApplyScope>('today');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 2));
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !template) return null;

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleApply = async () => {
    setApplying(true);
    setError(null);

    try {
      if (scope === 'today') {
        await onApplyToday(template.id);
      } else if (scope === 'range') {
        if (!startDate || !endDate) {
          setError('Please specify both start and end dates.');
          setApplying(false);
          return;
        }
        if (endDate < startDate) {
          setError('End date must be after or equal to start date.');
          setApplying(false);
          return;
        }
        await onApplyDateRange(template.id, startDate, endDate);
      } else if (scope === 'weekdays') {
        if (selectedDays.length === 0) {
          setError('Please select at least one day of the week.');
          setApplying(false);
          return;
        }
        await onAssignDaysOfWeek(template.id, selectedDays);
      } else if (scope === 'default') {
        await onSetAsDefault(template.id);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to apply template.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: template.color || '#3b82f6' }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Apply &quot;{template.name}&quot;</h2>
              <p className="text-xs text-slate-400">Choose where to activate this routine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Scope Options */}
          <div className="space-y-2">
            {/* Option 1: Today Only */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                scope === 'today'
                  ? 'bg-blue-600/15 border-blue-500 text-white'
                  : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="applyScope"
                checked={scope === 'today'}
                onChange={() => setScope('today')}
                className="mt-0.5 text-blue-600 focus:ring-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Today Only ({today})</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sets date override for today without affecting your weekly recurring schedule.
                </p>
              </div>
            </label>

            {/* Option 2: Date Range */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                scope === 'range'
                  ? 'bg-blue-600/15 border-blue-500 text-white'
                  : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="applyScope"
                checked={scope === 'range'}
                onChange={() => setScope('range')}
                className="mt-0.5 text-blue-600 focus:ring-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-blue-400" />
                  <span>Date Range (Vacation, Fasting, Project)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-2">
                  Applies this template across consecutive dates.
                </p>

                {scope === 'range' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 animate-in fade-in">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">From</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">To</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>

            {/* Option 3: Weekly Day Assignment */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                scope === 'weekdays'
                  ? 'bg-blue-600/15 border-blue-500 text-white'
                  : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="applyScope"
                checked={scope === 'weekdays'}
                onChange={() => setScope('weekdays')}
                className="mt-0.5 text-blue-600 focus:ring-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                  <span>Assign to Days of Week in Planner</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-2">
                  Sets recurring weekly schedule for selected weekdays.
                </p>

                {scope === 'weekdays' && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10 animate-in fade-in">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = selectedDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDay(d.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>

            {/* Option 4: Set as Default Fallback */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                scope === 'default'
                  ? 'bg-blue-600/15 border-blue-500 text-white'
                  : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="applyScope"
                checked={scope === 'default'}
                onChange={() => setScope('default')}
                className="mt-0.5 text-blue-600 focus:ring-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Set as Default Fallback Template</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Used as fallback routine whenever a day has no specific assignment.
                </p>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {applying ? 'Applying...' : 'Apply Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
