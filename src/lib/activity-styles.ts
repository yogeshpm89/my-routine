import { ActivityCategory } from '@/types/routine';

export interface ActivityTheme {
  cardGradient: string;
  ambientGlowA: string;
  ambientGlowB: string;
  borderColor: string;
  timelineCurrentBg: string;
  timelineCurrentRing: string;
  badgeBg: string;
  badgeText: string;
}

const CATEGORY_THEMES: Record<string, ActivityTheme> = {
  mindfulness: {
    cardGradient: 'from-emerald-950/90 via-slate-900/95 to-teal-950/70',
    ambientGlowA: 'bg-emerald-500/25',
    ambientGlowB: 'bg-teal-500/20',
    borderColor: 'border-emerald-500/40',
    timelineCurrentBg: 'bg-emerald-950/35',
    timelineCurrentRing: 'ring-1 ring-emerald-500/50 border-emerald-500/40 shadow-emerald-950/30',
    badgeBg: 'bg-emerald-950/80',
    badgeText: 'text-emerald-400',
  },
  learning: {
    cardGradient: 'from-purple-950/90 via-slate-900/95 to-fuchsia-950/70',
    ambientGlowA: 'bg-purple-500/25',
    ambientGlowB: 'bg-indigo-500/20',
    borderColor: 'border-purple-500/40',
    timelineCurrentBg: 'bg-purple-950/35',
    timelineCurrentRing: 'ring-1 ring-purple-500/50 border-purple-500/40 shadow-purple-950/30',
    badgeBg: 'bg-purple-950/80',
    badgeText: 'text-purple-400',
  },
  fitness: {
    cardGradient: 'from-teal-950/90 via-slate-900/95 to-cyan-950/70',
    ambientGlowA: 'bg-teal-500/25',
    ambientGlowB: 'bg-cyan-500/20',
    borderColor: 'border-teal-500/40',
    timelineCurrentBg: 'bg-teal-950/35',
    timelineCurrentRing: 'ring-1 ring-teal-500/50 border-teal-500/40 shadow-teal-950/30',
    badgeBg: 'bg-teal-950/80',
    badgeText: 'text-teal-400',
  },
  health: {
    cardGradient: 'from-amber-950/90 via-slate-900/95 to-orange-950/70',
    ambientGlowA: 'bg-amber-500/25',
    ambientGlowB: 'bg-orange-500/20',
    borderColor: 'border-amber-500/40',
    timelineCurrentBg: 'bg-amber-950/35',
    timelineCurrentRing: 'ring-1 ring-amber-500/50 border-amber-500/40 shadow-amber-950/30',
    badgeBg: 'bg-amber-950/80',
    badgeText: 'text-amber-400',
  },
  business: {
    cardGradient: 'from-orange-950/90 via-slate-900/95 to-amber-950/70',
    ambientGlowA: 'bg-orange-500/25',
    ambientGlowB: 'bg-amber-500/20',
    borderColor: 'border-orange-500/40',
    timelineCurrentBg: 'bg-orange-950/35',
    timelineCurrentRing: 'ring-1 ring-orange-500/50 border-orange-500/40 shadow-orange-950/30',
    badgeBg: 'bg-orange-950/80',
    badgeText: 'text-orange-400',
  },
  family: {
    cardGradient: 'from-rose-950/90 via-slate-900/95 to-pink-950/70',
    ambientGlowA: 'bg-rose-500/25',
    ambientGlowB: 'bg-pink-500/20',
    borderColor: 'border-rose-500/40',
    timelineCurrentBg: 'bg-rose-950/35',
    timelineCurrentRing: 'ring-1 ring-rose-500/50 border-rose-500/40 shadow-rose-950/30',
    badgeBg: 'bg-rose-950/80',
    badgeText: 'text-rose-400',
  },
  personal: {
    cardGradient: 'from-indigo-950/90 via-slate-900/95 to-purple-950/70',
    ambientGlowA: 'bg-indigo-500/25',
    ambientGlowB: 'bg-purple-500/20',
    borderColor: 'border-indigo-500/40',
    timelineCurrentBg: 'bg-indigo-950/35',
    timelineCurrentRing: 'ring-1 ring-indigo-500/50 border-indigo-500/40 shadow-indigo-950/30',
    badgeBg: 'bg-indigo-950/80',
    badgeText: 'text-indigo-400',
  },
  rest: {
    cardGradient: 'from-cyan-950/90 via-slate-900/95 to-blue-950/70',
    ambientGlowA: 'bg-cyan-500/25',
    ambientGlowB: 'bg-blue-500/20',
    borderColor: 'border-cyan-500/40',
    timelineCurrentBg: 'bg-cyan-950/35',
    timelineCurrentRing: 'ring-1 ring-cyan-500/50 border-cyan-500/40 shadow-cyan-950/30',
    badgeBg: 'bg-cyan-950/80',
    badgeText: 'text-cyan-400',
  },
  work: {
    cardGradient: 'from-blue-950/90 via-slate-900/95 to-indigo-950/70',
    ambientGlowA: 'bg-blue-500/25',
    ambientGlowB: 'bg-indigo-500/20',
    borderColor: 'border-blue-500/40',
    timelineCurrentBg: 'bg-blue-950/35',
    timelineCurrentRing: 'ring-1 ring-blue-500/50 border-blue-500/40 shadow-blue-900/30',
    badgeBg: 'bg-blue-950/80',
    badgeText: 'text-blue-400',
  },
  buffer: {
    cardGradient: 'from-slate-900 via-slate-900/95 to-slate-950',
    ambientGlowA: 'bg-slate-700/20',
    ambientGlowB: 'bg-slate-800/20',
    borderColor: 'border-slate-700/40',
    timelineCurrentBg: 'bg-slate-900/80',
    timelineCurrentRing: 'ring-1 ring-slate-600/40 border-slate-600/30',
    badgeBg: 'bg-slate-900/80',
    badgeText: 'text-slate-400',
  },
  other: {
    cardGradient: 'from-slate-900 via-slate-900/95 to-blue-950/60',
    ambientGlowA: 'bg-blue-500/20',
    ambientGlowB: 'bg-indigo-500/15',
    borderColor: 'border-white/10',
    timelineCurrentBg: 'bg-slate-900/90',
    timelineCurrentRing: 'ring-1 ring-blue-500/40 border-white/20',
    badgeBg: 'bg-slate-800/80',
    badgeText: 'text-slate-300',
  },
};

export function getActivityTheme(category?: ActivityCategory | string): ActivityTheme {
  const cat = (category || 'other').toLowerCase();
  return CATEGORY_THEMES[cat] || CATEGORY_THEMES.other;
}
