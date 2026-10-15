import React from 'react';
import { ActivityCategory } from '@/types/routine';
import {
  Briefcase,
  Sparkles,
  BookOpen,
  Users,
  HeartPulse,
  TrendingUp,
  Bike,
  Coffee,
  User,
  Clock,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const CATEGORY_CONFIG: Record<
  ActivityCategory,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  work: {
    label: 'Work',
    icon: Briefcase,
    color: 'text-blue-400',
    bg: 'bg-blue-950/60',
    border: 'border-blue-500/30',
  },
  mindfulness: {
    label: 'Mindfulness',
    icon: Sparkles,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/30',
  },
  learning: {
    label: 'Learning',
    icon: BookOpen,
    color: 'text-purple-400',
    bg: 'bg-purple-950/60',
    border: 'border-purple-500/30',
  },
  family: {
    label: 'Family',
    icon: Users,
    color: 'text-rose-400',
    bg: 'bg-rose-950/60',
    border: 'border-rose-500/30',
  },
  health: {
    label: 'Health & Sleep',
    icon: HeartPulse,
    color: 'text-amber-400',
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/30',
  },
  business: {
    label: 'Business',
    icon: TrendingUp,
    color: 'text-orange-400',
    bg: 'bg-orange-950/60',
    border: 'border-orange-500/30',
  },
  fitness: {
    label: 'Fitness',
    icon: Bike,
    color: 'text-teal-400',
    bg: 'bg-teal-950/60',
    border: 'border-teal-500/30',
  },
  rest: {
    label: 'Rest & Nap',
    icon: Coffee,
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/60',
    border: 'border-cyan-500/30',
  },
  personal: {
    label: 'Personal',
    icon: User,
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/60',
    border: 'border-indigo-500/30',
  },
  buffer: {
    label: 'Buffer',
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/40',
  },
  other: {
    label: 'Other',
    icon: Layers,
    color: 'text-gray-400',
    bg: 'bg-gray-900/60',
    border: 'border-gray-700/40',
  },
};

export function CategoryBadge({
  category,
  size = 'md',
  className,
}: {
  category: ActivityCategory;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors border',
        config.bg,
        config.color,
        config.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm',
        className
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}
