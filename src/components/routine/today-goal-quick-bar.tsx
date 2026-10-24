'use client';

import React, { useState } from 'react';
import { GoalTarget, ActivityOccurrence } from '@/types/routine';
import { GoalProgressEntry, GoalTrackingUnit } from '@/types/goal-progress';
import { GoalProgressCalculator } from '@/lib/goals/goal-progress-calculator';
import { formatDuration } from '@/lib/time-utils';
import {
  Target,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  RotateCcw,
  Bike,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface TodayGoalQuickBarProps {
  goals: GoalTarget[];
  occurrences: ActivityOccurrence[];
  goalProgress: GoalProgressEntry[];
  selectedDate: string;
  onRecordProgress: (params: {
    goalId: string;
    amount: number;
    unit: GoalTrackingUnit;
    durationMinutes: number;
    notes?: string;
    source?: 'manual' | 'quick_add';
  }) => Promise<void> | void;
  onUndoLastProgress: (goalId: string, date: string) => Promise<void> | void;
}

export function TodayGoalQuickBar({
  goals,
  occurrences,
  goalProgress,
  selectedDate,
  onRecordProgress,
  onUndoLastProgress,
}: TodayGoalQuickBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeGoals = goals.filter((g) => !g.isArchived);
  if (activeGoals.length === 0) return null;

  // Aggregate progress for each goal today
  const goalStats = activeGoals.map((goal) => {
    const unitConfig = GoalProgressCalculator.getGoalUnitConfig(goal.id, goal.title);
    const agg = GoalProgressCalculator.aggregateGoalMinutes(
      goal,
      occurrences,
      goalProgress,
      selectedDate
    );
    const todayEntries = goalProgress.filter(
      (e) => e.goalId === goal.id && e.date === selectedDate
    );
    return {
      goal,
      unitConfig,
      agg,
      todayEntries,
    };
  });

  const achievedCount = goalStats.filter((s) => s.agg.calculation.isAchieved).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleQuickAdd = async (
    goal: GoalTarget,
    amount: number,
    unit: GoalTrackingUnit,
    unitConfig: ReturnType<typeof GoalProgressCalculator.getGoalUnitConfig>
  ) => {
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
      showToast(`+${amount} ${unitText} logged for ${goal.title}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = async (
    goal: GoalTarget,
    unitConfig: ReturnType<typeof GoalProgressCalculator.getGoalUnitConfig>
  ) => {
    const num = parseFloat(customAmount);
    if (isNaN(num) || num <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const durationMinutes =
        unitConfig.primaryUnit === 'minutes'
          ? Math.round(num)
          : unitConfig.conversionToMinutes(num);

      await onRecordProgress({
        goalId: goal.id,
        amount: num,
        unit: unitConfig.primaryUnit,
        durationMinutes,
        source: 'manual',
      });

      showToast(`+${num} ${unitConfig.unitLabel} logged for ${goal.title}`);
      setCustomAmount('');
      setSelectedGoalId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async (goalId: string, goalTitle: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUndoLastProgress(goalId, selectedDate);
      showToast(`Last entry undone for ${goalTitle}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGoalIcon = (unit: GoalTrackingUnit) => {
    if (unit === 'km') return <Bike className="w-3.5 h-3.5 text-emerald-400" />;
    if (unit === 'chapters') return <BookOpen className="w-3.5 h-3.5 text-amber-400" />;
    if (unit === 'topics') return <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />;
    return <Target className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div
      id="today-daily-goals-bar"
      className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-900/90 border border-white/10 backdrop-blur-md shadow-lg space-y-3 relative overflow-hidden transition-all"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-2 right-2 z-20 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg animate-in fade-in flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
          aria-expanded={isExpanded}
          aria-label="Toggle daily goal quick tracker"
        >
          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 transition">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition">
                Daily Goal Tracker
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/20">
                {achievedCount} / {activeGoals.length} Achieved
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block">
              {isExpanded
                ? 'Tap any quick-add button to record minute & unit level updates'
                : 'Quick minute and unit progress tracking'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition flex items-center justify-center cursor-pointer"
          aria-label={isExpanded ? 'Collapse daily goals' : 'Expand daily goals'}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-300" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-300" />
          )}
        </button>
      </div>

      {/* Collapsed Compact Pills Preview */}
      {!isExpanded && (
        <div className="flex items-center gap-2 overflow-x-auto pt-0.5 pb-1 no-scrollbar">
          {goalStats.map(({ goal, unitConfig, agg }) => {
            const isAchieved = agg.calculation.isAchieved;
            const pct = agg.calculation.displayPercentage;

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => {
                  setSelectedGoalId(goal.id);
                  setIsExpanded(true);
                }}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition active:scale-95 cursor-pointer ${
                  isAchieved
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
                    : 'bg-slate-800/70 border-white/5 text-slate-300 hover:bg-slate-700/70'
                }`}
                title={`Click to log progress for ${goal.title}`}
              >
                {getGoalIcon(unitConfig.primaryUnit)}
                <span className="font-semibold truncate max-w-[110px] sm:max-w-[140px]">
                  {goal.title}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    isAchieved ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded Grid of Goal Trackers */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-white/5 animate-in fade-in">
          {goalStats.map(({ goal, unitConfig, agg, todayEntries }) => {
            const isAchieved = agg.calculation.isAchieved;
            const pct = agg.calculation.displayPercentage;
            const isSelected = selectedGoalId === goal.id;

            return (
              <div
                key={goal.id}
                className={`p-3 rounded-xl border transition-all space-y-2 relative ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500/40 shadow-md'
                    : isAchieved
                    ? 'bg-slate-800/40 border-emerald-500/20'
                    : 'bg-slate-800/40 border-white/5 hover:border-white/10'
                }`}
              >
                {/* Header inside card */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    {getGoalIcon(unitConfig.primaryUnit)}
                    <span className="text-xs font-bold text-white truncate" title={goal.title}>
                      {goal.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isAchieved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {pct}%
                    </span>
                    {todayEntries.length > 0 && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleUndo(goal.id, goal.title)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                        title="Undo last entry"
                        aria-label={`Undo last entry for ${goal.title}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-900/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isAchieved
                          ? 'bg-emerald-500'
                          : agg.calculation.rawPercentage > 0
                          ? 'bg-blue-500'
                          : 'bg-slate-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>
                      {formatDuration(agg.totalCompletedMinutes)} / {formatDuration(goal.targetMinutes)}
                      {agg.totalUnitValue > 0 && unitConfig.primaryUnit !== 'minutes' && (
                        <strong className="text-emerald-400 ml-1">
                          ({agg.totalUnitValue} {unitConfig.unitLabel})
                        </strong>
                      )}
                    </span>
                    {isAchieved ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Done
                      </span>
                    ) : (
                      <span>{formatDuration(agg.calculation.remainingMinutes)} left</span>
                    )}
                  </div>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {unitConfig.quickPresets.map((preset) => (
                    <button
                      key={`${goal.id}-${preset}`}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickAdd(goal, preset, unitConfig.primaryUnit, unitConfig)}
                      className="px-2 py-1 min-h-[32px] rounded-lg bg-slate-700/60 hover:bg-blue-600 hover:text-white text-[11px] font-semibold text-slate-200 border border-white/5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                      title={`Add ${preset} ${unitConfig.unitLabel}`}
                    >
                      +{preset} {unitConfig.unitLabel}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGoalId === goal.id) {
                        setSelectedGoalId(null);
                      } else {
                        setSelectedGoalId(goal.id);
                        setCustomAmount('');
                      }
                    }}
                    className={`px-2 py-1 min-h-[32px] rounded-lg text-[11px] font-semibold border transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-700/40 hover:bg-slate-700 border-white/5 text-slate-300'
                    }`}
                    title="Type custom amount"
                  >
                    Custom
                  </button>
                </div>

                {/* Inline Custom Input Drawer */}
                {isSelected && (
                  <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 animate-in fade-in">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder={`Amt (${unitConfig.unitLabel})`}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="flex-1 min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={isSubmitting || !customAmount}
                      onClick={() => handleCustomSubmit(goal, unitConfig)}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
