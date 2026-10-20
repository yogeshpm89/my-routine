'use client';

import React, { useState, useEffect } from 'react';
import { ActivityOccurrence } from '@/types/routine';
import { formatDisplayDate } from '@/lib/time-utils';
import {
  X,
  Palmtree,
  CalendarOff,
  Coffee,
  Sparkles,
  Plane,
  HeartPulse,
  Sun,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SkipCompleteRoutineModalProps {
  isOpen: boolean;
  date: string;
  occurrences: ActivityOccurrence[];
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  onConfirmSkip: (
    scope: 'all' | 'remaining',
    reason: string,
    markAsHoliday: boolean,
    customHolidayName?: string
  ) => Promise<void> | void;
  onClose: () => void;
}

const PRESET_REASONS = [
  { id: 'weekend', label: 'Weekend Break', icon: Coffee },
  { id: 'holiday', label: 'Public Holiday / Festival', icon: Palmtree },
  { id: 'vacation', label: 'Vacation / Travel', icon: Plane },
  { id: 'rest', label: 'Rest & Recharge', icon: Sun },
  { id: 'sick', label: 'Sick / Medical Rest', icon: HeartPulse },
  { id: 'personal', label: 'Personal Time Off', icon: Sparkles },
];

export function SkipCompleteRoutineModal({
  isOpen,
  date,
  occurrences,
  isWeekend,
  isHoliday,
  holidayName,
  onConfirmSkip,
  onClose,
}: SkipCompleteRoutineModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('Weekend Break');
  const [customNote, setCustomNote] = useState<string>('');
  const [scope, setScope] = useState<'all' | 'remaining'>('remaining');
  const [markAsHoliday, setMarkAsHoliday] = useState<boolean>(false);
  const [holidayTitleInput, setHolidayTitleInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set intelligent defaults when opened
  useEffect(() => {
    if (!isOpen) return;

    if (isHoliday && holidayName) {
      setSelectedReason('Public Holiday / Festival');
      setCustomNote(holidayName);
      setMarkAsHoliday(true);
      setHolidayTitleInput(holidayName);
    } else if (isWeekend) {
      setSelectedReason('Weekend Break');
      setCustomNote('Weekend Day Off');
      setMarkAsHoliday(false);
      setHolidayTitleInput('');
    } else {
      setSelectedReason('Rest & Recharge');
      setCustomNote('Taking the day off');
      setMarkAsHoliday(false);
      setHolidayTitleInput('');
    }
  }, [isOpen, isWeekend, isHoliday, holidayName]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount = occurrences.length;
  const completedCount = occurrences.filter((o) => o.log?.status === 'completed').length;
  const pendingCount = occurrences.filter(
    (o) => o.log?.status !== 'completed' && o.log?.status !== 'skipped'
  ).length;

  const handleSelectPreset = (reasonLabel: string) => {
    setSelectedReason(reasonLabel);
    if (reasonLabel === 'Public Holiday / Festival') {
      setMarkAsHoliday(true);
      if (!holidayTitleInput) {
        setHolidayTitleInput(holidayName || 'Public Holiday');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fullReason = customNote.trim()
        ? `${selectedReason}: ${customNote.trim()}`
        : selectedReason;

      await onConfirmSkip(
        completedCount > 0 ? scope : 'all',
        fullReason,
        markAsHoliday,
        holidayTitleInput.trim() || undefined
      );
      onClose();
    } catch (err) {
      console.error('Failed to skip complete routine:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-routine-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip with Decorative Gradient */}
        <div className="relative p-5 sm:p-6 pb-4 border-b border-white/10 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Palmtree className="w-6 h-6" />
              </div>
              <div>
                <h2
                  id="skip-routine-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-white tracking-tight"
                >
                  Skip Complete Routine
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-300">
                    {formatDisplayDate(date)}
                  </span>
                  {isWeekend && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🌴 Weekend
                    </span>
                  )}
                  {isHoliday && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      🏖️ {holidayName || 'Holiday'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Summary Box */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span>Day Overview</span>
              <span className="text-amber-400 font-bold">
                {totalCount} total {totalCount === 1 ? 'activity' : 'activities'} scheduled
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Skipping the routine will pause all reminders and alarms for this day and record your
              schedule as a planned break in your habit history.
            </p>
          </div>

          {/* Scope Selector (Only if some are already completed) */}
          {completedCount > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Which activities to skip?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setScope('remaining')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    scope === 'remaining'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      scope === 'remaining' ? 'border-blue-400 bg-blue-500' : 'border-slate-500'
                    }`}
                  >
                    {scope === 'remaining' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="font-semibold block">Remaining Activities</span>
                    <span className="text-[11px] text-slate-400">
                      Skip {pendingCount} pending, keep {completedCount} completed
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    scope === 'all'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      scope === 'all' ? 'border-blue-400 bg-blue-500' : 'border-slate-500'
                    }`}
                  >
                    {scope === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="font-semibold block">All Activities</span>
                    <span className="text-[11px] text-slate-400">
                      Mark all {totalCount} activities as skipped
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Quick Preset Reasons */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Select Reason for Break
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_REASONS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedReason === preset.label;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.label)}
                    className={`p-2.5 rounded-xl border text-left transition active:scale-95 cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-500/20 to-rose-500/20 border-amber-500/50 text-white shadow-md'
                        : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}
                    />
                    <span className="text-xs font-semibold leading-tight">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Note or Details */}
          <div className="space-y-1.5">
            <label
              htmlFor="skip-custom-note"
              className="block text-xs font-medium text-slate-300"
            >
              Note / Event (Optional)
            </label>
            <input
              id="skip-custom-note"
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Diwali Celebration, Family Trip, Long Weekend..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Mark as Holiday Checkbox Option */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markAsHoliday}
                onChange={(e) => setMarkAsHoliday(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-200">
                Mark {formatDisplayDate(date)} as a Holiday in Calendar
              </span>
            </label>

            {markAsHoliday && (
              <div className="pt-1">
                <input
                  type="text"
                  value={holidayTitleInput}
                  onChange={(e) => setHolidayTitleInput(e.target.value)}
                  placeholder="Holiday Name (e.g. Independence Day, Festival...)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="btn-confirm-skip-complete-routine"
              type="submit"
              disabled={isSubmitting || totalCount === 0}
              className="px-5 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 text-white shadow-lg shadow-rose-900/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <CalendarOff className="w-4 h-4" />
              <span>{isSubmitting ? 'Skipping...' : 'Skip Complete Routine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
