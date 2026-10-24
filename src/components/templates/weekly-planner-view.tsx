'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  Copy,
  Sparkles,
  ChevronRight,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sun,
  Briefcase,
} from 'lucide-react';
import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { calculateDuration, formatTime12Hour } from '@/lib/time-utils';

interface WeeklyPlannerViewProps {
  planner: WeeklyPlannerConfig;
  templates: DayRoutineTemplate[];
  onSetDayAssignment: (dayOfWeek: number, templateId: string) => Promise<void> | void;
  onSetDefaultFallback: (templateId: string) => Promise<void> | void;
  onCopyMondayToWeekdays: () => Promise<void> | void;
  onCopySaturdayToSunday: () => Promise<void> | void;
  onNavigateToTemplates: () => void;
  onOpenEditorForTemplate?: (template: DayRoutineTemplate) => void;
}

const DAYS = [
  { id: 1, name: 'Monday', short: 'Mon', isWeekend: false },
  { id: 2, name: 'Tuesday', short: 'Tue', isWeekend: false },
  { id: 3, name: 'Wednesday', short: 'Wed', isWeekend: false },
  { id: 4, name: 'Thursday', short: 'Thu', isWeekend: false },
  { id: 5, name: 'Friday', short: 'Fri', isWeekend: false },
  { id: 6, name: 'Saturday', short: 'Sat', isWeekend: true },
  { id: 0, name: 'Sunday', short: 'Sun', isWeekend: true },
];

export function WeeklyPlannerView({
  planner,
  templates,
  onSetDayAssignment,
  onSetDefaultFallback,
  onCopyMondayToWeekdays,
  onCopySaturdayToSunday,
  onNavigateToTemplates,
  onOpenEditorForTemplate,
}: WeeklyPlannerViewProps) {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const templateMap = new Map<string, DayRoutineTemplate>();
  templates.forEach((t) => templateMap.set(t.id, t));

  const handleCopyMonToWeekdays = async () => {
    await onCopyMondayToWeekdays();
    showFeedback('Copied Monday routine across Tuesday through Friday!');
  };

  const handleCopySatToSun = async () => {
    await onCopySaturdayToSunday();
    showFeedback('Copied Saturday routine to Sunday!');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Planner Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-blue-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Weekly Schedule Planner</h2>
            </div>
            <p className="text-xs text-slate-400">
              Assign daily routine templates across Monday through Sunday. Deterministic schedules for everyday life.
            </p>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMonToWeekdays}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              title="Duplicate Monday routine to Tue-Fri"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Copy Mon → Weekdays</span>
            </button>

            <button
              type="button"
              onClick={handleCopySatToSun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              title="Duplicate Saturday routine to Sunday"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copy Sat → Sun</span>
            </button>

            {/* Default Fallback Selector */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <span className="text-[11px] text-slate-400 font-medium">Fallback:</span>
              <select
                value={planner.defaultTemplateId}
                onChange={(e) => onSetDefaultFallback(e.target.value)}
                className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* 7-Day Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map((day) => {
          const assignedId = planner.assignments[String(day.id)] || planner.defaultTemplateId;
          const assignedTemplate = templateMap.get(assignedId) || templates[0];
          const isExpanded = expandedDay === day.id;

          const blocks = assignedTemplate?.blocks || [];
          const totalMinutes = blocks.reduce(
            (acc, b) => acc + calculateDuration(b.startTime, b.endTime),
            0
          );
          const totalHours = (totalMinutes / 60).toFixed(1);

          return (
            <div
              key={day.id}
              className={`rounded-2xl border transition-all duration-200 shadow-lg flex flex-col justify-between overflow-hidden ${
                day.isWeekend
                  ? 'bg-slate-900/70 border-emerald-500/20 hover:border-emerald-500/40'
                  : 'bg-slate-900/70 border-white/10 hover:border-white/20'
              }`}
            >
              {/* Day Header */}
              <div className="p-4 border-b border-white/5 bg-slate-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{day.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        day.isWeekend
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {day.isWeekend ? 'Weekend' : 'Weekday'}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{totalHours}h</span>
                  </span>
                </div>

                {/* Assigned Template Selector */}
                <div className="mt-2">
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                    Assigned Routine:
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: assignedTemplate?.color || '#3b82f6' }}
                    />
                    <select
                      value={assignedId}
                      onChange={(e) => onSetDayAssignment(day.id, e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.blocks.length} blocks)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Day Body: Blocks Summary */}
              <div className="p-4 flex-1 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{blocks.length} scheduled activities</span>
                  <button
                    type="button"
                    onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                    className="text-blue-400 hover:text-blue-300 text-[11px] font-medium"
                  >
                    {isExpanded ? 'Hide Schedule' : 'View Schedule'}
                  </button>
                </div>

                {/* Expanded Timeline Preview */}
                {isExpanded ? (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pt-2 animate-in fade-in">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-1.5 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: block.color || assignedTemplate?.color }}
                          />
                          <span className="font-semibold text-white truncate max-w-[140px]">
                            {block.title}
                          </span>
                        </div>
                        <span className="text-slate-400 shrink-0">
                          {formatTime12Hour(block.startTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Compact Preview of Top 3 Blocks */
                  <div className="space-y-1">
                    {blocks.slice(0, 3).map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-800/40 text-slate-300"
                      >
                        <span className="truncate max-w-[130px] font-medium">{block.title}</span>
                        <span className="text-slate-500 text-[10px] shrink-0">
                          {formatTime12Hour(block.startTime)}
                        </span>
                      </div>
                    ))}
                    {blocks.length > 3 && (
                      <p className="text-[10px] text-slate-500 text-center pt-0.5">
                        +{blocks.length - 3} more activities
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Day Card Footer */}
              <div className="px-4 py-2.5 border-t border-white/5 bg-slate-800/20 flex items-center justify-between text-xs">
                {assignedTemplate && onOpenEditorForTemplate && (
                  <button
                    type="button"
                    onClick={() => onOpenEditorForTemplate(assignedTemplate)}
                    className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <span>Edit Routine</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                <span className="text-[10px] text-slate-500">
                  {assignedTemplate?.isDefault ? 'Default Routine' : 'Custom Routine'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
