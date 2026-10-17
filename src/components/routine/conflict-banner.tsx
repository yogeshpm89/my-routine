'use client';

import React, { useState } from 'react';
import { ScheduleConflict } from '@/lib/conflict-detector';
import {
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  Clock,
  Target,
} from 'lucide-react';

interface ConflictBannerProps {
  conflicts: ScheduleConflict[];
  onOpenActivity?: (templateId: string) => void;
}

export function ConflictBanner({ conflicts, onOpenActivity }: ConflictBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!conflicts || conflicts.length === 0) return null;

  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');

  const hasErrors = errors.length > 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
        hasErrors
          ? 'bg-rose-950/40 border-rose-500/40 shadow-rose-950/20'
          : 'bg-amber-950/30 border-amber-500/30 shadow-amber-950/10'
      }`}
    >
      {/* Banner Summary Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              hasErrors
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {hasErrors ? (
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight">
                {hasErrors
                  ? `${errors.length} Schedule Collision ${errors.length > 1 ? 'Errors' : 'Error'}`
                  : 'Schedule & Goal Advisory'}
              </h4>
              {hasErrors && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {hasErrors
                ? 'Protected fixed commitment is double-booked. Tap to inspect.'
                : `${warnings.length} advisory notice${warnings.length > 1 ? 's' : ''} (goal deficits or flexible overlaps).`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            {isExpanded ? 'Collapse' : 'View Details'}
          </span>
          <button className="p-1 rounded-lg text-slate-400 hover:text-white transition">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Conflict Items */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-3 bg-slate-950/60">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                conflict.severity === 'error'
                  ? 'bg-rose-950/50 border-rose-500/30 text-rose-200'
                  : 'bg-amber-950/40 border-amber-500/20 text-amber-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {conflict.severity === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : conflict.type === 'goal_deficit' ? (
                    <Target className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="font-bold text-white">{conflict.title}</span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                    conflict.severity === 'error'
                      ? 'bg-rose-500/30 text-rose-300'
                      : 'bg-amber-500/30 text-amber-300'
                  }`}
                >
                  {conflict.severity}
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed">{conflict.description}</p>

              {/* Action buttons if activities are linked */}
              {(conflict.activityA || conflict.activityB) && onOpenActivity && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {conflict.activityA && (
                    <button
                      onClick={() => onOpenActivity(conflict.activityA!.templateId)}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-medium text-xs border border-white/10 transition cursor-pointer"
                    >
                      <span>Adjust {conflict.activityA.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {conflict.activityB && (
                    <button
                      onClick={() => onOpenActivity(conflict.activityB!.templateId)}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-medium text-xs border border-white/10 transition cursor-pointer"
                    >
                      <span>Adjust {conflict.activityB.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
