'use client';

import React, { useState } from 'react';
import { GoalTrackedItem } from '@/types/goals';
import { Plus, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

interface ItemQuickProgressProps {
  goalId: string;
  item: GoalTrackedItem;
  onLogQuickIncrement: (goalId: string, itemId: string, delta: number) => Promise<void> | void;
  onOpenCustomLog: (item: GoalTrackedItem) => void;
  disabled?: boolean;
}

export function ItemQuickProgress({
  goalId,
  item,
  onLogQuickIncrement,
  onOpenCustomLog,
  disabled = false,
}: ItemQuickProgressProps) {
  const [activeIncrement, setActiveIncrement] = useState<number | null>(null);

  const unit = (item.unitLabel || 'units').toLowerCase();
  const isCompleted = item.status === 'completed';

  const getPresets = (): { label: string; value: number }[] => {
    if (item.quickIncrements && item.quickIncrements.length > 0) {
      return item.quickIncrements.map((v) => ({ label: `+${v}`, value: v }));
    }
    if (unit.includes('page')) {
      return [
        { label: '+5', value: 5 },
        { label: '+10', value: 10 },
        { label: '+25', value: 25 },
        { label: '+50', value: 50 },
      ];
    }
    if (unit.includes('min')) {
      return [
        { label: '+5m', value: 5 },
        { label: '+10m', value: 10 },
        { label: '+15m', value: 15 },
        { label: '+30m', value: 30 },
      ];
    }
    if (unit.includes('mod') || unit.includes('chap') || unit.includes('less') || unit.includes('top')) {
      return [
        { label: '+1', value: 1 },
        { label: '+2', value: 2 },
      ];
    }
    return [
      { label: '+1', value: 1 },
      { label: '+5', value: 5 },
      { label: '+10', value: 10 },
    ];
  };

  const handleChipClick = async (delta: number) => {
    if (disabled) return;
    setActiveIncrement(delta);
    try {
      await onLogQuickIncrement(goalId, item.id, delta);
    } finally {
      setTimeout(() => setActiveIncrement(null), 400);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/5 flex-wrap">
      {/* Quick Increment Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-500 font-medium">Quick add:</span>
        {getPresets().map(({ label, value }) => {
          const isPending = activeIncrement === value;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => handleChipClick(value)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition cursor-pointer select-none active:scale-95 ${
                isPending
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 scale-105'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
            >
              {isPending ? '✓' : label}
            </button>
          );
        })}
      </div>

      {/* Custom Log Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpenCustomLog(item)}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition cursor-pointer ml-auto"
      >
        <TrendingUp className="w-3 h-3" />
        <span>+ Log</span>
      </button>
    </div>
  );
}
