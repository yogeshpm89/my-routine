'use client';

import React, { useState, useEffect } from 'react';
import { ActivityOccurrence, DailyActivityGoal } from '@/types/routine';
import { LifeGoal, GoalPhase, GoalTrackedItem } from '@/types/goals';
import { formatTime12Hour } from '@/lib/time-utils';
import { VoiceInputButton } from './voice-input-button';
import {
  X,
  Target,
  Sparkles,
  BookOpen,
  GraduationCap,
  ListChecks,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface SetDailyGoalModalProps {
  isOpen: boolean;
  occurrence: ActivityOccurrence | null;
  lifeGoals: LifeGoal[];
  onSaveDailyGoal: (
    occurrence: ActivityOccurrence,
    dailyGoal: DailyActivityGoal | null
  ) => Promise<void> | void;
  onClose: () => void;
}

export function SetDailyGoalModal({
  isOpen,
  occurrence,
  lifeGoals,
  onSaveDailyGoal,
  onClose,
}: SetDailyGoalModalProps) {
  const [goalText, setGoalText] = useState('');
  const [selectedLifeGoalId, setSelectedLifeGoalId] = useState<string>('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [selectedPhaseTaskId, setSelectedPhaseTaskId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [targetUnits, setTargetUnits] = useState<number | ''>('');
  const [unitLabel, setUnitLabel] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from occurrence's existing dailyGoal or smart defaults
  useEffect(() => {
    if (!isOpen || !occurrence) return;

    setError(null);

    const existingGoal = occurrence.dailyGoal;
    if (existingGoal) {
      setGoalText(existingGoal.text || '');
      setSelectedLifeGoalId(existingGoal.lifeGoalId || '');
      setSelectedPhaseId(existingGoal.phaseId || '');
      setSelectedPhaseTaskId(existingGoal.phaseTaskId || '');
      setSelectedItemId(existingGoal.itemId || '');
      setTargetUnits(existingGoal.targetUnits ?? '');
      setUnitLabel(existingGoal.unitLabel || '');
    } else {
      // Smart default: find linked life goal for this routine template
      const matchedGoal = lifeGoals.find((g) =>
        g.linkedTemplateIds?.includes(occurrence.templateId)
      );

      setGoalText('');
      setSelectedLifeGoalId(matchedGoal ? matchedGoal.id : '');
      setSelectedPhaseId('');
      setSelectedPhaseTaskId('');
      setSelectedItemId('');
      setTargetUnits('');
      setUnitLabel('');
    }
  }, [isOpen, occurrence, lifeGoals]);

  if (!isOpen || !occurrence) return null;

  const currentLifeGoal = lifeGoals.find((g) => g.id === selectedLifeGoalId);

  // Phase selection handler
  const handleSelectPhaseTask = (phase: GoalPhase, taskId: string, taskText: string) => {
    setSelectedPhaseId(phase.id);
    setSelectedPhaseTaskId(taskId);
    setSelectedItemId('');
    setTargetUnits('');
    setGoalText(taskText);
  };

  // Item selection handler
  const handleSelectItem = (item: GoalTrackedItem) => {
    setSelectedItemId(item.id);
    setSelectedPhaseId('');
    setSelectedPhaseTaskId('');
    setUnitLabel(item.unitLabel || 'units');
    setTargetUnits(1);
    setGoalText(`Complete 1 ${item.unitLabel || 'unit'} of ${item.title}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalText.trim()) {
      setError('Please enter a goal description or select a target from your Life Goal.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPhase = currentLifeGoal?.phases?.find((p) => p.id === selectedPhaseId);
      const selectedItem = currentLifeGoal?.items?.find((i) => i.id === selectedItemId);

      const dailyGoal: DailyActivityGoal = {
        id: occurrence.dailyGoal?.id || `dgoal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: goalText.trim(),
        lifeGoalId: selectedLifeGoalId || undefined,
        lifeGoalTitle: currentLifeGoal?.title || undefined,
        phaseId: selectedPhaseId || undefined,
        phaseTitle: selectedPhase?.title || undefined,
        phaseTaskId: selectedPhaseTaskId || undefined,
        itemId: selectedItemId || undefined,
        itemTitle: selectedItem?.title || undefined,
        targetUnits: typeof targetUnits === 'number' ? targetUnits : undefined,
        unitLabel: unitLabel || undefined,
        isCompleted: occurrence.dailyGoal?.isCompleted ?? (occurrence.log?.status === 'completed'),
        completedAt: occurrence.dailyGoal?.completedAt,
      };

      await onSaveDailyGoal(occurrence, dailyGoal);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearGoal = async () => {
    setIsSubmitting(true);
    try {
      await onSaveDailyGoal(occurrence, null);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-slate-900 border-t sm:border border-white/10 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 sm:px-6 py-4 shrink-0 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                Set Goal for Today&apos;s Activity
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <strong className="text-blue-300">{occurrence.title}</strong> &bull;{' '}
                {formatTime12Hour(occurrence.startTime)} &ndash; {formatTime12Hour(occurrence.endTime)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex flex-col grow overflow-hidden">
          <div className="overflow-y-auto grow p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300">
                {error}
              </div>
            )}

            {/* Life Goal Association Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Contribute to Life Goal
              </label>
              <select
                value={selectedLifeGoalId}
                onChange={(e) => {
                  setSelectedLifeGoalId(e.target.value);
                  setSelectedPhaseId('');
                  setSelectedPhaseTaskId('');
                  setSelectedItemId('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No Life Goal / Standalone Daily Goal --</option>
                {lifeGoals.map((lg) => {
                  const isLinked = lg.linkedTemplateIds?.includes(occurrence.templateId);
                  return (
                    <option key={lg.id} value={lg.id}>
                      {lg.title} {isLinked ? '★ (Linked to this activity)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* If Life Goal Selected: Roadmap Phases & Tasks Picker */}
            {currentLifeGoal && currentLifeGoal.phases && currentLifeGoal.phases.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                    <ListChecks className="w-4 h-4 text-blue-400" />
                    <span>Select from Roadmap Tasks:</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Tap to choose today&apos;s focus</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {currentLifeGoal.phases.map((phase) => {
                    const uncompletedTasks = (phase.tasks || []).filter((t) => !t.isCompleted);
                    if (uncompletedTasks.length === 0) return null;

                    return (
                      <div key={phase.id} className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-300 block truncate">
                          {phase.title}
                        </span>
                        <div className="grid grid-cols-1 gap-1 pl-1.5">
                          {uncompletedTasks.map((task) => {
                            const isSelected =
                              selectedPhaseId === phase.id && selectedPhaseTaskId === task.id;

                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => handleSelectPhaseTask(phase, task.id, task.text)}
                                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600/30 border-blue-500 text-white font-semibold'
                                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-700/60'
                                }`}
                              >
                                <span className="truncate flex-1">&bull; {task.text}</span>
                                {isSelected ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If Life Goal Selected: Tracked Items Picker */}
            {currentLifeGoal && currentLifeGoal.items && currentLifeGoal.items.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/10 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <span>Select from Tracked Items:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentLifeGoal.items
                    .filter((item) => item.status !== 'completed')
                    .map((item) => {
                      const isSelected = selectedItemId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className={`p-2 rounded-xl text-left text-xs transition border cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-purple-600/30 border-purple-500 text-white font-semibold'
                              : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-700/60'
                          }`}
                        >
                          <div className="truncate flex-1">
                            <span className="block truncate font-medium">{item.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {item.currentUnits}/{item.totalUnits} {item.unitLabel}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Goal Text Input Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Today&apos;s Target Description *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="e.g. Prompt Engg, Chapter 3, 20 KM, or Module 2"
                  className="w-full px-3.5 py-2.5 pr-11 rounded-xl bg-slate-800/90 border border-white/10 text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="absolute right-2 top-2">
                  <VoiceInputButton
                    onTranscript={(txt) => setGoalText((prev) => (prev ? `${prev} ${txt}` : txt))}
                    size="sm"
                    title="Voice input for daily goal"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter what specific part, topic, module, or milestone you plan to complete during this session today.
              </p>
            </div>

            {/* Target Units (Optional, for numeric metrics or tracked items) */}
            {(selectedItemId || currentLifeGoal?.metricType === 'numeric' || currentLifeGoal?.trackingMode === 'metric') && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={targetUnits}
                    onChange={(e) => setTargetUnits(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 1, 15, 20"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Unit Label
                  </label>
                  <input
                    type="text"
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    placeholder="e.g. modules, km, pages"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 sm:px-6 py-4 shrink-0 bg-slate-900/90">
            {occurrence.dailyGoal ? (
              <button
                type="button"
                onClick={handleClearGoal}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Goal</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!goalText.trim() || isSubmitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <Target className="w-3.5 h-3.5" />
                <span>{occurrence.dailyGoal ? 'Update Goal' : 'Set Goal'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

