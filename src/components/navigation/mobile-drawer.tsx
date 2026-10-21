'use client';

import React, { useEffect } from 'react';
import {
  Clock,
  CalendarDays,
  Calendar,
  BarChart3,
  Settings,
  Sparkles,
  Plus,
  RefreshCw,
  X,
  LogOut,
  LogIn,
  UserPlus,
  Wifi,
  WifiOff,
  ChevronRight,
  ShieldCheck,
  Target,
  Gauge,
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'today' | 'week' | 'month' | 'goals' | 'ai' | 'analytics' | 'settings';
  onSelectTab: (tab: 'today' | 'week' | 'month' | 'goals' | 'ai' | 'analytics' | 'settings') => void;
  onOpenCreate: () => void;
  onSyncNow?: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenSpeedometer?: () => void;
  user: any;
  isDemoMode: boolean;
  onSignOut: () => Promise<void>;
}

export function MobileDrawer({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenCreate,
  onSyncNow,
  onOpenAuth,
  onOpenSpeedometer,
  user,
  isDemoMode,
  onSignOut,
}: MobileDrawerProps) {
  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isGuestOrAnonymous = !user || user.isAnonymous || isDemoMode;

  const NAV_ITEMS = [
    {
      id: 'today' as const,
      label: 'Today Timeline',
      subtitle: 'Daily routine schedule & live tracker',
      icon: Clock,
      color: 'text-blue-400 bg-blue-500/10',
    },
    {
      id: 'week' as const,
      label: 'Week Planner',
      subtitle: '7-day overview & day switcher',
      icon: CalendarDays,
      color: 'text-teal-400 bg-teal-500/10',
    },
    {
      id: 'month' as const,
      label: 'Month Calendar',
      subtitle: 'Full monthly habit calendar grid',
      icon: Calendar,
      color: 'text-purple-400 bg-purple-500/10',
    },
    {
      id: 'goals' as const,
      label: 'Life Goals',
      subtitle: 'Personal & professional milestone targets',
      icon: Target,
      color: 'text-indigo-400 bg-indigo-500/10',
    },
    {
      id: 'analytics' as const,
      label: 'Analytics & Time Targets',
      subtitle: 'Completion rates & routine analytics',
      icon: BarChart3,
      color: 'text-amber-400 bg-amber-500/10',
    },
    {
      id: 'ai' as const,
      label: 'AI Routine Actions',
      subtitle: 'Prompts, journals & automated briefs',
      icon: Sparkles,
      color: 'text-fuchsia-400 bg-fuchsia-500/10',
    },
    {
      id: 'settings' as const,
      label: 'Settings & Alerts',
      subtitle: 'Alarms, watch sync, backups & cloud',
      icon: Settings,
      color: 'text-slate-300 bg-slate-800',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-slate-950 border-l border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/80 backdrop-blur-md pt-safe flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl p-1 bg-slate-800 border border-white/10 shadow-md flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="My Routine Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                My Routine
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isGuestOrAnonymous ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <WifiOff className="w-2.5 h-2.5" /> Guest Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Wifi className="w-2.5 h-2.5" /> Cloud Synced
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card if logged in */}
        {!isGuestOrAnonymous && (
          <div className="p-4 bg-slate-900/40 border-b border-white/5 flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-10 h-10 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden flex-1">
              <span className="text-sm font-bold text-white block truncate">
                {user.displayName || 'Routine Champion'}
              </span>
              <span className="text-xs text-slate-400 block truncate">{user.email}</span>
            </div>
          </div>
        )}

        {/* Quick Action Button: Add Activity */}
        <div className="p-3 bg-slate-900/30 border-b border-white/5">
          <button
            onClick={() => {
              onClose();
              onOpenCreate();
            }}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Activity</span>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 block">
            Navigation Views
          </span>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full min-h-[48px] flex items-center justify-between p-3 rounded-2xl border transition text-left active:scale-[0.98] cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 border-blue-500/40 text-white shadow-md'
                    : 'bg-slate-900/40 border-white/5 text-slate-300 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`text-sm font-bold block leading-tight ${isActive ? 'text-blue-300' : 'text-white'}`}>
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-600'}`} />
              </button>
            );
          })}

          {/* Quick Tools Section */}
          {onOpenSpeedometer && (
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 block">
                Quick Utilities
              </span>
              <button
                type="button"
                id="drawer-btn-speedometer"
                onClick={() => {
                  onClose();
                  onOpenSpeedometer();
                }}
                className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-slate-200 hover:bg-cyan-950/70 hover:text-white transition text-left active:scale-[0.98] cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-white leading-tight">
                      Speedometer & Trip
                    </span>
                    <span className="text-[11px] text-cyan-300/80 block leading-tight mt-0.5">
                      GPS speed, HUD & pace logger
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer with Actions & Auth */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-md pb-safe space-y-2">
          {onSyncNow && !isGuestOrAnonymous && (
            <button
              onClick={() => {
                onClose();
                onSyncNow();
              }}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold border border-white/10 transition"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Sync with Cloud Firestore</span>
            </button>
          )}

          {isGuestOrAnonymous ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth('login');
                }}
                className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth('register');
                }}
                className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={async () => {
                onClose();
                await onSignOut();
              }}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 active:scale-95 text-rose-300 text-xs font-semibold border border-rose-500/20 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          )}

          <div className="pt-1 text-center">
            <span className="text-[10px] text-slate-500 font-mono">
              My Routine • In-App Cloud Updates Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
