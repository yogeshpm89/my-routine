'use client';

import React, { useState, useEffect } from 'react';
import { ActivityOccurrence, ActivityStatus } from '@/types/routine';
import { ActivityTimelineItem } from './activity-timeline-item';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  ListFilter,
  Palmtree,
  CalendarOff,
  RotateCcw,
  X,
  Target,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { LifeGoal } from '@/types/goals';
import { DayRoutineTemplate } from '@/types/routine-templates';
import { GoalTarget } from '@/types/routine';
import { GoalProgressEntry, GoalTrackingUnit } from '@/types/goal-progress';
import { TodayGoalQuickBar } from './today-goal-quick-bar';
import {
  addDays,
  timeToMinutes,
  getCurrentTimeString,
  formatDisplayDate,
  getTodayDateString,
} from '@/lib/time-utils';

interface TodayTimelineProps {
  occurrences: ActivityOccurrence[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onUpdateStatus: (
    occurrence: ActivityOccurrence,
    status: ActivityStatus,
    extra?: { actualStartTime?: string; actualEndTime?: string; actualDurationMinutes?: number }
  ) => void;
  onOpenCreate: () => void;
  onEdit: (occurrence: ActivityOccurrence) => void;
  onDuplicate: (occurrence: ActivityOccurrence) => void;
  onDelete: (occurrence: ActivityOccurrence) => void;
  onPlayMedia?: (occurrence: ActivityOccurrence, mediaIndex?: number) => void;
  onExecuteAi?: (occurrence: ActivityOccurrence) => void;
  onToggleStep?: (occurrence: ActivityOccurrence, stepId: string) => void;
  onOpenSkipModal?: () => void;
  onResumeCompleteRoutine?: () => void;
  isWeekend?: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  onAddComment?: (occurrence: ActivityOccurrence, text: string) => Promise<void> | void;
  onUpdateComment?: (occurrence: ActivityOccurrence, commentId: string, text: string) => Promise<void> | void;
  onDeleteComment?: (occurrence: ActivityOccurrence, commentId: string) => Promise<void> | void;
  lifeGoals?: LifeGoal[];
  onSwitchToGoals?: () => void;
  activeDayTemplate?: DayRoutineTemplate | null;
  allDayTemplates?: DayRoutineTemplate[];
  onQuickSwitchTemplate?: (templateId: string) => void;
  dailyGoals?: GoalTarget[];
  goalProgress?: GoalProgressEntry[];
  onRecordGoalProgress?: (params: {
    goalId: string;
    amount: number;
    unit: GoalTrackingUnit;
    durationMinutes: number;
    notes?: string;
    source?: 'manual' | 'quick_add';
  }) => Promise<void> | void;
  onUndoLastGoalProgress?: (goalId: string, date: string) => Promise<void> | void;
}

export function TodayTimeline({
  occurrences,
  selectedDate,
  onSelectDate,
  onUpdateStatus,
  onOpenCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onPlayMedia,
  onExecuteAi,
  onToggleStep,
  onOpenSkipModal,
  onResumeCompleteRoutine,
  isWeekend = false,
  isHoliday = false,
  holidayName,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  lifeGoals,
  onSwitchToGoals,
  activeDayTemplate,
  allDayTemplates,
  onQuickSwitchTemplate,
  dailyGoals,
  goalProgress,
  onRecordGoalProgress,
  onUndoLastGoalProgress,
}: TodayTimelineProps) {
  const [currentTime, setCurrentTime] = useState<string>('08:00');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'skipped'>('all');
  const [dismissedSuggestionDate, setDismissedSuggestionDate] = useState<string | null>(null);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState<boolean>(true);

  useEffect(() => {
    setCurrentTime(getCurrentTimeString('Asia/Kolkata'));
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeString('Asia/Kolkata'));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentMinutes = timeToMinutes(currentTime);
  const formattedDate = formatDisplayDate(selectedDate);
  const todayStr = getTodayDateString('Asia/Kolkata');

  const totalCount = occurrences.length;
  const completedCount = occurrences.filter((o) => o.log?.status === 'completed').length;
  const skippedCount = occurrences.filter((o) => o.log?.status === 'skipped').length;
  const pendingCount = occurrences.filter(
    (o) => o.log?.status !== 'completed' && o.log?.status !== 'skipped'
  ).length;
  const isAllSkipped = totalCount > 0 && skippedCount === totalCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter occurrences
  const filteredOccurrences = occurrences.filter((occ) => {
    if (taskFilter === 'completed') return occ.log?.status === 'completed';
    if (taskFilter === 'skipped') return occ.log?.status === 'skipped';
    if (taskFilter === 'pending')
      return occ.log?.status !== 'completed' && occ.log?.status !== 'skipped';
    return true; // 'all'
  });

  // 5-day quick selector around selectedDate
  const quickDays = [-2, -1, 0, 1, 2].map((offset) => addDays(selectedDate, offset));

  const showWeekendOrHolidaySuggestion =
    (isWeekend || isHoliday) &&
    totalCount > 0 &&
    !isAllSkipped &&
    dismissedSuggestionDate !== selectedDate;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Header Strip & Controls */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-lg space-y-3">
        {/* Main Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Date Selector Row */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap">
            <button
              id="btn-prev-day"
              type="button"
              onClick={() => onSelectDate(addDays(selectedDate, -1))}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="Previous day"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-white/5 min-h-[44px]">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap">
                {formattedDate}
              </span>

              {isHoliday && (
                <span
                  title={holidayName || 'Holiday'}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate max-w-[120px]"
                >
                  🏖️ {holidayName || 'Holiday'}
                </span>
              )}

              {isWeekend && !isHoliday && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  🌴 Weekend
                </span>
              )}

              {activeDayTemplate && (
                <div className="relative flex items-center">
                  <select
                    value={activeDayTemplate.id}
                    onChange={(e) => onQuickSwitchTemplate?.(e.target.value)}
                    className="appearance-none bg-slate-900/90 hover:bg-slate-800 text-white text-[10px] sm:text-[11px] font-bold pl-2.5 pr-6 py-1 rounded-md border border-white/10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
                    style={{ borderLeftColor: activeDayTemplate.color || '#3b82f6', borderLeftWidth: '3px' }}
                    title="Active day routine template (click to quick-switch)"
                  >
                    {(allDayTemplates || [activeDayTemplate]).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
                </div>
              )}

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="sr-only"
                id="timeline-native-date-input"
              />
              <label
                htmlFor="timeline-native-date-input"
                className="text-[11px] text-blue-400 font-medium hover:underline cursor-pointer pl-1"
                title="Pick date"
              >
                Pick
              </label>
            </div>

            <button
              id="btn-next-day"
              type="button"
              onClick={() => onSelectDate(addDays(selectedDate, 1))}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="Next day"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress & Actions Row */}
          <div className="flex items-center gap-2 sm:gap-2.5 justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5 flex-wrap">
            {totalCount > 0 && !isAllSkipped ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-xs">
                  {completedCount}/{totalCount} done
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  {completionPercentage}%
                </span>
              </div>
            ) : isAllSkipped ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-300">
                <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 text-xs font-bold border border-amber-500/30">
                  🌴 Day Off
                </span>
              </div>
            ) : (
              <div />
            )}

            {/* Skip Routine / Resume Routine Action Button */}
            {isAllSkipped ? (
              <button
                id="btn-resume-routine"
                type="button"
                onClick={onResumeCompleteRoutine}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                title="Resume complete routine for this day"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Resume Routine</span>
              </button>
            ) : totalCount > 0 ? (
              <button
                id="btn-skip-routine"
                type="button"
                onClick={onOpenSkipModal}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-xl bg-slate-800/90 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/30 text-slate-300 border border-white/10 transition-all active:scale-[0.98] cursor-pointer"
                title="Skip complete routine on holiday / weekend"
              >
                <Palmtree className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden xs:inline">Skip Routine</span>
                <span className="xs:hidden">Skip</span>
              </button>
            ) : null}

            {/* Add Activity Button */}
            <button
              id="btn-create-activity"
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Activity</span>
            </button>
          </div>
        </div>

        {/* Quick Day Switcher Strip (horizontal pills for fast 1-tap navigation) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar border-t border-white/5">
          {quickDays.map((dStr) => {
            const isSelected = dStr === selectedDate;
            const isToday = dStr === todayStr;
            const [y, m, d] = dStr.split('-').map(Number);
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            const dayName = new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              timeZone: 'UTC',
            }).format(dateObj);
            const dayNum = dateObj.getUTCDate();

            return (
              <button
                key={dStr}
                type="button"
                onClick={() => onSelectDate(dStr)}
                className={`flex-1 min-w-[54px] min-h-[46px] py-1 px-1.5 rounded-xl flex flex-col items-center justify-center border transition active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'bg-slate-800/60 border-white/5 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase leading-none ${
                    isSelected ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {isToday ? 'Today' : dayName}
                </span>
                <span className="text-xs sm:text-sm font-extrabold mt-0.5 leading-none">
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Complete Routine Skipped Hero Banner (When all activities are skipped) */}
      {isAllSkipped && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-900/60 border border-amber-500/30 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Palmtree className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    Complete Routine Skipped
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Day Off
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  All {totalCount} routine activities for this day are paused. Notifications are
                  silenced so you can rest and recharge.
                </p>
              </div>
            </div>

            <button
              id="btn-hero-resume-routine"
              type="button"
              onClick={onResumeCompleteRoutine}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/25 transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume Routine</span>
            </button>
          </div>
        </div>
      )}

      {/* Smart Weekend / Holiday Suggestion Banner (If day off detected & routine active) */}
      {showWeekendOrHolidaySuggestion && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-200">
                  {isHoliday
                    ? `Holiday: ${holidayName || 'Public Holiday'}`
                    : 'Weekend Break Detected'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300">
                  Day Off
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Want to take the day off? You can skip the complete routine and silence today&apos;s
                alarms with 1 click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              id="btn-suggestion-skip-complete-routine"
              type="button"
              onClick={onOpenSkipModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <CalendarOff className="w-3.5 h-3.5" />
              <span>Skip Complete Routine</span>
            </button>

            <button
              type="button"
              onClick={() => setDismissedSuggestionDate(selectedDate)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Dismiss suggestion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Life Goals Teaser Banner */}
      {lifeGoals && lifeGoals.length > 0 && onSwitchToGoals && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-slate-900/60 border border-indigo-500/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Target className="w-4 h-4 text-indigo-400" />
              <span>Active Goals:</span>
            </div>
            {lifeGoals.slice(0, 3).map((g) => {
              const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={onSwitchToGoals}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-[11px] text-slate-300 transition cursor-pointer"
                >
                  <span className="font-semibold text-white truncate max-w-[140px] sm:max-w-[180px]">
                    {g.title}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-400">
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onSwitchToGoals}
            className="self-end sm:self-auto inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
          >
            <span>View Goals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Daily Goals Quick Progress Bar */}
      {dailyGoals && dailyGoals.length > 0 && onRecordGoalProgress && (
        <TodayGoalQuickBar
          goals={dailyGoals}
          occurrences={occurrences}
          goalProgress={goalProgress || []}
          selectedDate={selectedDate}
          onRecordProgress={onRecordGoalProgress}
          onUndoLastProgress={onUndoLastGoalProgress || (() => {})}
        />
      )}

      {/* Task Filter Strip on Mobile & Desktop */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 border border-white/10 rounded-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setTaskFilter('all')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                taskFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] opacity-75">({totalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('pending')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                taskFilter === 'pending'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Remaining</span>
              <span className="text-[10px] opacity-75">({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('completed')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                taskFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Done</span>
              <span className="text-[10px] opacity-75">({completedCount})</span>
            </button>
            {skippedCount > 0 && (
              <button
                type="button"
                onClick={() => setTaskFilter('skipped')}
                className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                  taskFilter === 'skipped'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:text-white'
                }`}
              >
                <CalendarOff className="w-3 h-3" />
                <span>Skipped</span>
                <span className="text-[10px] opacity-75">({skippedCount})</span>
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Showing {filteredOccurrences.length} of {totalCount} blocks
          </span>
        </div>
      )}

      {/* Timeline Stream */}
      {filteredOccurrences.length > 0 ? (
        <div className="space-y-2">
          {taskFilter === 'all' && completedCount > 0 && pendingCount + skippedCount > 0 ? (
            <>
              {/* Active & Pending Activities Stream */}
              <div className="space-y-1">
                {occurrences
                  .filter((occ) => occ.log?.status !== 'completed')
                  .map((occurrence) => {
                    const startM = timeToMinutes(occurrence.startTime);
                    const endM = timeToMinutes(occurrence.endTime);
                    const isCurrent =
                      endM >= startM
                        ? currentMinutes >= startM && currentMinutes < endM
                        : currentMinutes >= startM || currentMinutes < endM;

                    return (
                      <ActivityTimelineItem
                        key={occurrence.occurrenceId}
                        occurrence={occurrence}
                        isCurrent={isCurrent}
                        onUpdateStatus={onUpdateStatus}
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onPlayMedia={onPlayMedia}
                        onExecuteAi={onExecuteAi}
                        onToggleStep={onToggleStep}
                        onAddComment={onAddComment}
                        onUpdateComment={onUpdateComment}
                        onDeleteComment={onDeleteComment}
                      />
                    );
                  })}
              </div>

              {/* Collapsible Completed Activities Section */}
              <div className="pt-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden transition-all duration-200 shadow-md">
                  <button
                    type="button"
                    id="btn-toggle-completed-activities"
                    onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
                    className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-white/5 transition-colors cursor-pointer text-left select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white">
                            Completed Activities
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                            {completedCount} of {totalCount} done
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isCompletedCollapsed
                            ? 'Collapsed to save vertical screen space • Tap to view'
                            : 'Tap to collapse completed activities'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-400 font-semibold hidden sm:inline">
                        {isCompletedCollapsed ? 'Expand' : 'Collapse'}
                      </span>
                      <div
                        className={`p-1.5 rounded-lg bg-slate-800 text-slate-400 transition-transform duration-200 ${
                          !isCompletedCollapsed ? 'rotate-180' : ''
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {!isCompletedCollapsed && (
                    <div className="p-2 sm:p-3 border-t border-white/5 space-y-1 animate-in fade-in duration-200">
                      {occurrences
                        .filter((occ) => occ.log?.status === 'completed')
                        .map((occurrence) => {
                          const startM = timeToMinutes(occurrence.startTime);
                          const endM = timeToMinutes(occurrence.endTime);
                          const isCurrent =
                            endM >= startM
                              ? currentMinutes >= startM && currentMinutes < endM
                              : currentMinutes >= startM || currentMinutes < endM;

                          return (
                            <ActivityTimelineItem
                              key={occurrence.occurrenceId}
                              occurrence={occurrence}
                              isCurrent={isCurrent}
                              onUpdateStatus={onUpdateStatus}
                              onEdit={onEdit}
                              onDuplicate={onDuplicate}
                              onDelete={onDelete}
                              onPlayMedia={onPlayMedia}
                              onExecuteAi={onExecuteAi}
                              onToggleStep={onToggleStep}
                              onAddComment={onAddComment}
                              onUpdateComment={onUpdateComment}
                              onDeleteComment={onDeleteComment}
                            />
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              {filteredOccurrences.map((occurrence) => {
                const startM = timeToMinutes(occurrence.startTime);
                const endM = timeToMinutes(occurrence.endTime);
                const isCurrent =
                  endM >= startM
                    ? currentMinutes >= startM && currentMinutes < endM
                    : currentMinutes >= startM || currentMinutes < endM;

                return (
                  <ActivityTimelineItem
                    key={occurrence.occurrenceId}
                    occurrence={occurrence}
                    isCurrent={isCurrent}
                    onUpdateStatus={onUpdateStatus}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onPlayMedia={onPlayMedia}
                    onExecuteAi={onExecuteAi}
                    onToggleStep={onToggleStep}
                    onAddComment={onAddComment}
                    onUpdateComment={onUpdateComment}
                    onDeleteComment={onDeleteComment}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : occurrences.length > 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No tasks match this filter</h3>
          <p className="text-xs text-slate-400">
            {taskFilter === 'pending'
              ? 'All scheduled routines for this day are completed or skipped!'
              : taskFilter === 'completed'
              ? 'No activities have been logged as completed yet.'
              : 'No activities have been marked as skipped.'}
          </p>
          <button
            type="button"
            onClick={() => setTaskFilter('all')}
            className="text-xs font-semibold text-blue-400 hover:underline pt-1 inline-block"
          >
            Show All Activities
          </button>
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 space-y-3">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No activities for this day</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don&apos;t have any scheduled routines or tasks for {formattedDate}. Tap below to
            create one.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Activity
          </button>
        </div>
      )}
    </div>
  );
}
