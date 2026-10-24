'use client';

import React, { useState } from 'react';
import { GoalTarget } from '@/types/routine';
import { GoalProgressEntry, GoalTrackingUnit } from '@/types/goal-progress';
import { GoalFulfillment } from '@/lib/analytics/analytics-calculator';
import { GoalProgressCalculator } from '@/lib/goals/goal-progress-calculator';
import { formatDuration } from '@/lib/time-utils';
import {
  Plus,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Target,
  Sparkles,
  Bike,
  BookOpen,
  GraduationCap,
} from 'lucide-react';

interface GoalProgressCardProps {
  goal: GoalTarget;
  fulfillment: GoalFulfillment;
  date: string;
  entries: GoalProgressEntry[];
  onRecordProgress: (params: {
    goalId: string;
    amount: number;
    unit: GoalTrackingUnit;
    durationMinutes: number;
    notes?: string;
    source?: 'manual' | 'quick_add';
  }) => Promise<void> | void;
  onDeleteEntry: (entryId: string) => Promise<void> | void;
  onUndoLastEntry: (goalId: string, date: string) => Promise<void> | void;
  onEditGoal?: (goal: GoalTarget) => void;
}

export function GoalProgressCard({
  goal,
  fulfillment,
  date,
  entries,
  onRecordProgress,
  onDeleteEntry,
  onUndoLastEntry,
  onEditGoal,
}: GoalProgressCardProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState<GoalTrackingUnit>('minutes');
  const [customNotes, setCustomNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unitConfig = GoalProgressCalculator.getGoalUnitConfig(goal.id, goal.title);

  // Initialize customUnit to goal's primary natural unit
  React.useEffect(() => {
    setCustomUnit(unitConfig.primaryUnit);
  }, [unitConfig.primaryUnit]);

  // Entries for this goal on the selected date
  const todayEntries = entries.filter(
    (e) => e.goalId === goal.id && e.date === date
  );

  // Total unit value sum (e.g. total km or chapters)
  const totalUnitValue = todayEntries
    .filter((e) => e.unit === unitConfig.primaryUnit)
    .reduce((sum, e) => sum + (e.amount ?? e.unitValue ?? 0), 0);

  const calc = GoalProgressCalculator.calculateProgress(
    fulfillment.targetMinutes,
    fulfillment.actualMinutes,
    unitConfig.primaryUnit,
    totalUnitValue
  );

  const showConfirmation = (msg: string) => {
    setConfirmationMessage(msg);
    setTimeout(() => {
      setConfirmationMessage(null);
    }, 3000);
  };

  const handleQuickAdd = async (amount: number, unit: GoalTrackingUnit) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const durationMinutes =
        unit === 'minutes' ? amount : unitConfig.conversionToMinutes(amount);

      await onRecordProgress({
        goalId: goal.id,
        amount,
        unit,
        durationMinutes,
        source: 'quick_add',
      });

      const unitText = unit === 'minutes' ? 'min' : unit;
      showConfirmation(`+${amount} ${unitText} (${formatDuration(durationMinutes)}) recorded`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(customAmount);
    if (isNaN(num) || num <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const durationMinutes =
        customUnit === 'minutes'
          ? Math.round(num)
          : unitConfig.conversionToMinutes(num);

      await onRecordProgress({
        goalId: goal.id,
        amount: num,
        unit: customUnit,
        durationMinutes,
        notes: customNotes.trim() || undefined,
        source: 'manual',
      });

      const unitText = customUnit === 'minutes' ? 'min' : customUnit;
      showConfirmation(`+${num} ${unitText} (${formatDuration(durationMinutes)}) recorded`);
      setCustomAmount('');
      setCustomNotes('');
      setIsCustomOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (todayEntries.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUndoLastEntry(goal.id, date);
      showConfirmation('Last entry undone');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Styling
  const getStatusBadge = () => {
    if (calc.isAchieved) {
      return {
        label: calc.isOverTarget ? 'Over Target' : 'Achieved',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      };
    }
    if (fulfillment.status === 'on_track') {
      return {
        label: 'On Track',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      };
    }
    if (fulfillment.status === 'unscheduled') {
      return {
        label: 'Unscheduled',
        bg: 'bg-slate-700/40 text-slate-400 border-slate-600/30',
      };
    }
    return {
      label: 'Under Target',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
  };

  const statusBadge = getStatusBadge();

  // Natural Icon Helper
  const getGoalIcon = () => {
    if (unitConfig.primaryUnit === 'km') {
      return <Bike className="w-4 h-4 text-emerald-400" />;
    }
    if (unitConfig.primaryUnit === 'chapters') {
      return <BookOpen className="w-4 h-4 text-amber-400" />;
    }
    if (unitConfig.primaryUnit === 'topics') {
      return <GraduationCap className="w-4 h-4 text-indigo-400" />;
    }
    return <Target className="w-4 h-4 text-blue-400" />;
  };

  // Preview conversion for custom amount
  const parsedCustomNum = parseFloat(customAmount);
  const previewMinutes =
    !isNaN(parsedCustomNum) && parsedCustomNum > 0
      ? customUnit === 'minutes'
        ? Math.round(parsedCustomNum)
        : unitConfig.conversionToMinutes(parsedCustomNum)
      : 0;

  return (
    <div
      id={`goal-card-${goal.id}`}
      className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition-all backdrop-blur-md space-y-3.5 relative overflow-hidden"
    >
      {/* Transient Confirmation Banner */}
      {confirmationMessage && (
        <div className="absolute top-2 right-2 z-10 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg animate-in fade-in slide-in-from-top-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{confirmationMessage}</span>
        </div>
      )}

      {/* Header Row: Title, Natural Unit Badge, Status, Edit */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5">
            {getGoalIcon()}
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
              <span>{goal.title}</span>
              {totalUnitValue > 0 && unitConfig.primaryUnit !== 'minutes' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 border border-emerald-500/20">
                  {totalUnitValue} {unitConfig.unitLabel}
                </span>
              )}
            </h4>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Target: {formatDuration(fulfillment.targetMinutes)}</span>
              <span>•</span>
              <span>
                Actual: <strong className="text-emerald-400">{formatDuration(fulfillment.actualMinutes)}</strong>
              </span>
              {fulfillment.manualMinutes !== undefined && fulfillment.manualMinutes > 0 && (
                <span className="text-[10px] text-slate-400">
                  ({formatDuration(fulfillment.manualMinutes)} manual)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
          >
            {statusBadge.label}
          </span>
          {onEditGoal && (
            <button
              type="button"
              onClick={() => onEditGoal(goal)}
              className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95 flex items-center justify-center cursor-pointer"
              title="Edit goal target"
              aria-label={`Edit ${goal.title}`}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Progress Bar (Capped at 100%) */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full rounded-full bg-slate-800/90 overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              calc.isAchieved
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : fulfillment.status === 'on_track'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                : fulfillment.status === 'under_target'
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-gradient-to-r from-slate-600 to-slate-500'
            }`}
            style={{ width: `${calc.displayPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400">
          <span className="font-medium text-slate-300">
            {calc.displayPercentage}% completed
            {calc.isOverTarget && (
              <span className="text-emerald-400 font-bold ml-1">
                (+{formatDuration(calc.overTargetMinutes)} extra)
              </span>
            )}
          </span>
          {calc.remainingMinutes > 0 ? (
            <span className="text-amber-400 font-medium">
              {formatDuration(calc.remainingMinutes)} remaining
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
            </span>
          )}
        </div>
      </div>

      {/* Quick-Add Controls Row */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
        {/* Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
            Quick Add:
          </span>

          {/* Natural unit presets (km, ch, topic, or min) */}
          {unitConfig.quickPresets.map((preset) => (
            <button
              key={`${unitConfig.primaryUnit}-${preset}`}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickAdd(preset, unitConfig.primaryUnit)}
              className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-slate-800/90 hover:bg-blue-600 hover:text-white border border-white/5 hover:border-blue-500/30 text-xs font-semibold text-slate-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title={`Add ${preset} ${unitConfig.unitLabel}`}
              aria-label={`Add ${preset} ${unitConfig.unitLabel}`}
            >
              +{preset} {unitConfig.unitLabel}
            </button>
          ))}

          {/* If primary unit is not minutes, also offer small 15m / 30m shortcuts */}
          {unitConfig.primaryUnit !== 'minutes' && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickAdd(15, 'minutes')}
                className="px-2 py-1.5 min-h-[36px] rounded-xl bg-slate-800/60 hover:bg-slate-700 text-[11px] font-medium text-slate-400 hover:text-slate-200 border border-white/5 transition active:scale-95 cursor-pointer"
                title="Add 15 minutes"
                aria-label="Add 15 minutes"
              >
                +15m
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickAdd(30, 'minutes')}
                className="px-2 py-1.5 min-h-[36px] rounded-xl bg-slate-800/60 hover:bg-slate-700 text-[11px] font-medium text-slate-400 hover:text-slate-200 border border-white/5 transition active:scale-95 cursor-pointer"
                title="Add 30 minutes"
                aria-label="Add 30 minutes"
              >
                +30m
              </button>
            </>
          )}

          {/* Custom Toggle */}
          <button
            type="button"
            onClick={() => setIsCustomOpen(!isCustomOpen)}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
              isCustomOpen
                ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 border-white/5 text-slate-300'
            }`}
            title="Custom amount"
            aria-label="Custom amount"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Custom</span>
          </button>
        </div>

        {/* Undo and History Controls */}
        <div className="flex items-center gap-1.5">
          {todayEntries.length > 0 && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleUndo}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-xl bg-slate-800/70 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/30 text-slate-300 border border-white/5 text-xs font-medium transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Undo last progress entry"
                aria-label="Undo last entry"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Undo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[36px] rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-white/5 text-xs transition cursor-pointer"
                title="Toggle entry history"
                aria-label="Toggle entry history"
              >
                <span>{todayEntries.length} logged</span>
                {showHistory ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expandable Custom Amount Form */}
      {isCustomOpen && (
        <form
          onSubmit={handleCustomSubmit}
          className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-blue-500/30 space-y-3 animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="number"
                step="any"
                min="0.1"
                placeholder={unitConfig.primaryUnit === 'km' ? 'e.g. 15' : 'e.g. 1'}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-medium text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                autoFocus
                required
              />

              {/* Unit selector */}
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as GoalTrackingUnit)}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-semibold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {unitConfig.primaryUnit !== 'minutes' && (
                  <option value={unitConfig.primaryUnit}>{unitConfig.unitLabel}</option>
                )}
                <option value="minutes">min</option>
                {unitConfig.primaryUnit !== 'km' && <option value="km">km</option>}
                {unitConfig.primaryUnit !== 'chapters' && <option value="chapters">chapters</option>}
                {unitConfig.primaryUnit !== 'topics' && <option value="topics">topics</option>}
              </select>
            </div>

            <input
              type="text"
              placeholder="Optional note (e.g. Evening ride to lake)"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !customAmount}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Log Progress
              </button>
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {previewMinutes > 0 && customUnit !== 'minutes' && (
            <p className="text-[11px] text-emerald-400 font-medium">
              Preview: {customAmount} {customUnit} = {formatDuration(previewMinutes)} recorded
            </p>
          )}
        </form>
      )}

      {/* Expandable Today's Log History */}
      {showHistory && todayEntries.length > 0 && (
        <div className="pt-2 border-t border-white/5 space-y-2 animate-in fade-in">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Today's Logged Progress
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {todayEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-2 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">
                    +{entry.amount ?? entry.unitValue ?? (entry.durationMinutes ?? entry.minutes ?? 0)} {entry.unit}
                  </span>
                  <span className="text-slate-400">
                    ({formatDuration(entry.durationMinutes ?? entry.minutes ?? 0)})
                  </span>
                  {entry.notes && (
                    <span className="text-slate-300 text-[11px] italic truncate max-w-[150px] sm:max-w-[240px]">
                      "{entry.notes}"
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                  title="Delete entry"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
