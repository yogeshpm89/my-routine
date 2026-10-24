'use client';

import React, { useState } from 'react';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
  GoalTarget,
  ActivityOccurrence,
} from '@/types/routine';
import { GoalProgressEntry, GoalTrackingUnit } from '@/types/goal-progress';
import { AnalyticsCalculator, RoutineAnalyticsSummary } from '@/lib/analytics/analytics-calculator';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { addDays, formatDuration, getDayOfWeek } from '@/lib/time-utils';
import { CATEGORY_CONFIG, CategoryBadge } from '@/components/routine/activity-badge';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Calendar,
  Layers,
  Plus,
  Edit2,
} from 'lucide-react';
import { GoalEditorDialog } from './goal-editor-dialog';
import { GoalProgressCard } from './goal-progress-card';

interface AnalyticsTabProps {
  userId?: string;
  selectedDate: string;
  templates: RoutineTemplate[];
  overrides: OccurrenceOverride[];
  logs: ActivityLog[];
  goals: GoalTarget[];
  goalProgress?: GoalProgressEntry[];
  onSaveGoal?: (goal: GoalTarget) => void;
  onDeleteGoal?: (goalId: string) => void;
  onRecordGoalProgress?: (params: {
    goalId: string;
    amount: number;
    unit: GoalTrackingUnit;
    durationMinutes: number;
    notes?: string;
    source?: 'manual' | 'quick_add';
  }) => Promise<void> | void;
  onDeleteGoalProgress?: (entryId: string) => Promise<void> | void;
  onUndoLastGoalProgress?: (goalId: string, date: string) => Promise<void> | void;
}

export function AnalyticsTab({
  userId = '',
  selectedDate,
  templates,
  overrides,
  logs,
  goals,
  goalProgress = [],
  onSaveGoal,
  onDeleteGoal,
  onRecordGoalProgress,
  onDeleteGoalProgress,
  onUndoLastGoalProgress,
}: AnalyticsTabProps) {
  const [timeframe, setTimeframe] = useState<'day' | 'week'>('day');
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalTarget | null>(null);

  // Compute occurrences based on timeframe
  let occurrences: ActivityOccurrence[] = [];
  let startDate = selectedDate;
  let endDate = selectedDate;

  if (timeframe === 'day') {
    occurrences = generateDailyOccurrences(templates, overrides, logs, selectedDate);
  } else {
    // Week: 7 days starting from Monday of the week
    const currentDow = getDayOfWeek(selectedDate);
    const mondayOffset = currentDow === 0 ? -6 : 1 - currentDow;
    startDate = addDays(selectedDate, mondayOffset);
    endDate = addDays(startDate, 6);

    for (let i = 0; i < 7; i++) {
      const dateStr = addDays(startDate, i);
      const dayOccs = generateDailyOccurrences(templates, overrides, logs, dateStr);
      occurrences.push(...dayOccs);
    }
  }

  const summary = AnalyticsCalculator.computeSummary(
    occurrences,
    goals,
    timeframe,
    startDate,
    endDate,
    goalProgress
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Execution Analytics & Goal Insights
            </h2>
            <p className="text-xs text-slate-400">
              {timeframe === 'day'
                ? `Daily performance for ${selectedDate}`
                : `Weekly cumulative performance (${startDate} to ${endDate})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-white/5 w-full sm:w-auto">
          <button
            onClick={() => setTimeframe('day')}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold transition active:scale-95 flex items-center justify-center ${
              timeframe === 'day'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Day View
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold transition active:scale-95 flex items-center justify-center ${
              timeframe === 'week'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Weekly Aggregate
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Planned Time</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatDuration(summary.totalPlannedMinutes)}
          </div>
          <div className="text-[11px] text-slate-400">
            {summary.statusCounts.completed + summary.statusCounts.pending} scheduled blocks
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Logged Time</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {formatDuration(summary.totalActualMinutes)}
          </div>
          <div className="text-[11px] text-emerald-400/80 font-medium">
            {summary.adherenceRate}% time adherence
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {summary.completionRate}%
          </div>
          <div className="text-[11px] text-purple-300 font-medium">
            {summary.statusCounts.completed} of {occurrences.length} done
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Goals</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {summary.goalFulfillments.filter((g) => g.status === 'achieved').length} / {summary.goalFulfillments.length}
          </div>
          <div className="text-[11px] text-amber-300/80 font-medium">
            targets met
          </div>
        </div>
      </div>

      {/* Smart Insights Banner */}
      {summary.insights.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-blue-500/20 backdrop-blur-md space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-blue-400" /> AI & Routine Insights
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-slate-300">
            {summary.insights.map((insight, idx) => (
              <p key={idx} className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>{insight}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Goal Targets Fulfillment Meters */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Daily & Weekly Time Targets</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              {summary.goalFulfillments.length} targets tracked
            </span>
            {onSaveGoal && (
              <button
                type="button"
                onClick={() => {
                  setEditingGoal(null);
                  setGoalEditorOpen(true);
                }}
                className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Target</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {summary.goalFulfillments.map((gf) => (
            <GoalProgressCard
              key={gf.goal.id}
              goal={gf.goal}
              fulfillment={gf}
              date={selectedDate}
              entries={goalProgress}
              onRecordProgress={onRecordGoalProgress || (() => {})}
              onDeleteEntry={onDeleteGoalProgress || (() => {})}
              onUndoLastEntry={onUndoLastGoalProgress || (() => {})}
              onEditGoal={
                onSaveGoal
                  ? (g) => {
                      setEditingGoal(g);
                      setGoalEditorOpen(true);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Category Time Allocation Breakdown */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/5">
          <Layers className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">Category Time Distribution</h3>
        </div>

        <div className="space-y-3">
          {summary.categoryBreakdown.map((cat) => {
            const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.other;

            return (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={cat.category} size="sm" />
                    <span className="text-slate-400">({cat.count} blocks)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white">
                      {formatDuration(cat.plannedMinutes)}
                    </span>
                    {cat.actualMinutes > 0 && (
                      <span className="text-emerald-400 ml-1.5 font-medium">
                        ({formatDuration(cat.actualMinutes)} logged)
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${cat.percentageOfPlanned}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onSaveGoal && (
        <GoalEditorDialog
          isOpen={goalEditorOpen}
          userId={userId}
          initialGoal={editingGoal}
          onSave={onSaveGoal}
          onDelete={onDeleteGoal}
          onClose={() => {
            setGoalEditorOpen(false);
            setEditingGoal(null);
          }}
        />
      )}
    </div>
  );
}
