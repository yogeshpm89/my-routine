'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, getAuthErrorMessage } from '@/lib/firebase/auth-context';
import {
  RoutineTemplate,
  OccurrenceOverride,
  ActivityLog,
  ActivityOccurrence,
  ActivityStatus,
  EditScope,
  GoalTarget,
} from '@/types/routine';
import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { OverrideRepository } from '@/lib/repositories/override-repository';
import { LogRepository } from '@/lib/repositories/log-repository';
import { GoalRepository } from '@/lib/repositories/goal-repository';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { detectScheduleConflicts } from '@/lib/conflict-detector';
import { getTodayDateString, addDays, getDayOfWeek } from '@/lib/time-utils';
import { CurrentActivityCard } from '@/components/routine/current-activity-card';
import { TodayTimeline } from '@/components/routine/today-timeline';
import { ConflictBanner } from '@/components/routine/conflict-banner';
import { WeekView } from '@/components/calendar/week-view';
import { MonthView } from '@/components/calendar/month-view';
import { SettingsTab } from '@/components/settings/settings-tab';
import { AnalyticsTab } from '@/components/analytics/analytics-tab';
import { UserMenu } from '@/components/auth/user-menu';
import { ConflictResolverModal } from '@/components/sync/conflict-resolver-modal';
import { SyncEngine, SyncConflict } from '@/lib/sync/sync-engine';
import { NotificationManager } from '@/lib/notifications/notification-manager';
import { NotificationPreferencesRepository } from '@/lib/notifications/preferences-repository';
import { ActivityEditorDialog } from '@/components/routine/activity-editor-dialog';
import { RecurrenceEditScopeDialog } from '@/components/routine/recurrence-edit-scope-dialog';
import { QuickLogModal } from '@/components/routine/quick-log-modal';
import {
  Clock,
  CalendarDays,
  Calendar,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/auth-modal';
import { Capacitor } from '@capacitor/core';

export default function RoutineApp() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const isAuthenticated = Boolean(user && !user.isAnonymous);
  const userId = user?.uid || '';

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('register');

  const [selectedDate, setSelectedDate] = useState<string>('2026-10-15');
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'analytics' | 'settings'>('today');

  useEffect(() => {
    setSelectedDate(getTodayDateString('Asia/Kolkata'));
  }, []);

  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [overrides, setOverrides] = useState<OccurrenceOverride[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [goals, setGoals] = useState<GoalTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<ActivityOccurrence | null>(null);

  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingTemplateData, setPendingTemplateData] = useState<RoutineTemplate | null>(null);

  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogOccurrence, setQuickLogOccurrence] = useState<ActivityOccurrence | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  // Load routine data
  const loadData = useCallback(async () => {
    if (authLoading || !isAuthenticated || !userId) return;
    setIsLoading(true);
    try {
      const [tList, oList, lList, gList] = await Promise.all([
        RoutineRepository.getTemplates(userId),
        OverrideRepository.getOverridesForDate(userId, selectedDate),
        LogRepository.getLogsForDate(userId, selectedDate),
        GoalRepository.getGoals(userId),
      ]);
      setTemplates(tList);
      setOverrides(oList);
      setLogs(lList);
      setGoals(gList);
    } catch (err) {
      console.error('Failed to load routine data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedDate, authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !userId) return;
    loadData();
    const unsubConflicts = SyncEngine.subscribeConflicts(setSyncConflicts);
    const unsubRealtime = SyncEngine.startRealtimeListener(userId, () => {
      loadData();
    });
    return () => {
      unsubConflicts();
      unsubRealtime();
    };
  }, [loadData, userId, authLoading, isAuthenticated]);

  const handleResolveConflict = async (
    conflictId: string,
    resolution: 'keep_local' | 'accept_remote'
  ) => {
    await SyncEngine.resolveConflict(userId, conflictId, resolution);
    showToast('Sync conflict resolved');
    loadData();
  };

  // Reconcile native 72-hour notifications upon routine updates
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    NotificationManager.initialize(userId);
    if (templates.length > 0) {
      const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
      NotificationManager.reconcileNotifications(userId, templates, overrides, prefs);
    }
  }, [userId, templates, overrides, isAuthenticated]);

  // Generate computed occurrences for the day
  const occurrences = generateDailyOccurrences(templates, overrides, logs, selectedDate);
  const dayOfWeek = getDayOfWeek(selectedDate);
  const conflicts = detectScheduleConflicts(occurrences, goals, dayOfWeek);

  // Status updates
  const handleUpdateStatus = async (
    occurrence: ActivityOccurrence,
    status: ActivityStatus,
    extra?: { actualStartTime?: string; actualEndTime?: string; actualDurationMinutes?: number }
  ) => {
    const updated = await LogRepository.updateStatus(
      userId,
      selectedDate,
      occurrence.templateId,
      status,
      extra
    );

    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });

    showToast(`Marked "${occurrence.title}" as ${status.replace('_', ' ')}`);
  };

  // Activity Editor Handlers
  const handleOpenCreate = () => {
    setEditingOccurrence(null);
    setEditorOpen(true);
  };

  const handleEditOccurrence = (occurrence: ActivityOccurrence) => {
    setEditingOccurrence(occurrence);
    setEditorOpen(true);
  };

  const handleOpenActivityByTemplateId = (templateId: string) => {
    const occ = occurrences.find((o) => o.templateId === templateId);
    if (occ) {
      handleEditOccurrence(occ);
    } else {
      const temp = templates.find((t) => t.id === templateId);
      if (temp) {
        // Construct pseudo-occurrence to edit
        const dummyOcc = generateDailyOccurrences([temp], overrides, logs, selectedDate)[0];
        if (dummyOcc) handleEditOccurrence(dummyOcc);
      }
    }
  };

  const handleSaveActivity = ({ template }: { template: RoutineTemplate }) => {
    if (editingOccurrence && editingOccurrence.template.recurrence.frequency !== 'once') {
      setPendingTemplateData(template);
      setEditorOpen(false);
      setScopeDialogOpen(true);
    } else {
      applySaveTemplate(template);
      setEditorOpen(false);
    }
  };

  const applySaveTemplate = async (template: RoutineTemplate) => {
    await RoutineRepository.saveTemplate(template);
    showToast(`Saved routine "${template.title}"`);
    loadData();
  };

  const handleSelectScope = async (scope: EditScope) => {
    setScopeDialogOpen(false);
    if (!pendingTemplateData || !editingOccurrence) return;

    if (scope === 'this_occurrence') {
      const override: OccurrenceOverride = {
        id: `override_${editingOccurrence.templateId}_${selectedDate}`,
        userId,
        templateId: editingOccurrence.templateId,
        date: selectedDate,
        modifiedStartTime: pendingTemplateData.startTime,
        modifiedEndTime: pendingTemplateData.endTime,
        modifiedTitle: pendingTemplateData.title,
        notes: pendingTemplateData.notes,
        isCancelled: false,
        isPostponed: false,
        updatedAt: Date.now(),
      };
      await OverrideRepository.saveOverride(override);
      showToast(`Applied changes to ${selectedDate} only`);
    } else if (scope === 'future_occurrences') {
      const yesterday = addDays(selectedDate, -1);
      const oldTemplate = {
        ...editingOccurrence.template,
        recurrence: {
          ...editingOccurrence.template.recurrence,
          endDate: yesterday,
        },
      };
      await RoutineRepository.saveTemplate(oldTemplate);

      const newTemplate: RoutineTemplate = {
        ...pendingTemplateData,
        id: `template_${Date.now()}_future`,
        recurrence: {
          ...pendingTemplateData.recurrence,
          startDate: selectedDate,
        },
      };
      await RoutineRepository.saveTemplate(newTemplate);
      showToast(`Applied changes from ${selectedDate} onward`);
    } else {
      await RoutineRepository.saveTemplate(pendingTemplateData);
      showToast(`Updated recurring template "${pendingTemplateData.title}"`);
    }

    setPendingTemplateData(null);
    setEditingOccurrence(null);
    loadData();
  };

  const handleDuplicateOccurrence = async (occurrence: ActivityOccurrence) => {
    await RoutineRepository.duplicateTemplate(userId, occurrence.templateId);
    showToast(`Duplicated "${occurrence.title}"`);
    loadData();
  };

  const handleDeleteOccurrence = async (occurrence: ActivityOccurrence) => {
    if (confirm(`Are you sure you want to delete "${occurrence.title}"?`)) {
      await RoutineRepository.deleteTemplate(userId, occurrence.templateId);
      showToast(`Deleted "${occurrence.title}"`);
      loadData();
    }
  };

  const handleDeleteTemplateFromEditor = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this routine activity?')) {
      await RoutineRepository.deleteTemplate(userId, templateId);
      setEditorOpen(false);
      showToast('Deleted routine activity');
      loadData();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Connecting to routine engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white shadow-2xl animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                My Routine
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="text-blue-400 font-medium">Asia/Kolkata</span>
                <span>•</span>
                <span>Adaptive Routine Engine</span>
              </div>
            </div>
          </div>

          {isAuthenticated ? (
            <>
              {/* View Tabs */}
              <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5">
                {[
                  { id: 'today', label: 'Day', icon: Clock },
                  { id: 'week', label: 'Week', icon: CalendarDays },
                  { id: 'month', label: 'Month', icon: Calendar },
                  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                  { id: 'settings', label: 'Settings & Sync', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Status & Profile Pill */}
              <div className="flex items-center gap-2.5">
                <div
                  title="Connected to Cloud Firestore"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-white/10"
                >
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px] hidden sm:inline">Cloud Synced</span>
                </div>

                <button
                  onClick={() => setSelectedDate(getTodayDateString('Asia/Kolkata'))}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition cursor-pointer"
                >
                  Today
                </button>

                <UserMenu />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <UserMenu />
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!isAuthenticated ? (
        /* Welcome & Authentication Gate (Routine hidden until login) */
        <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 grow flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Ambient decorative lights */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Firebase Cloud-Synced Routine Engine</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Master Your Schedule,{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Own Your Day
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
              Organize habit occurrences, automate time-blocking, and detect schedule overlaps in real time. Please sign in or create an account to view and customize your daily routine.
            </p>

            {/* Main Action Triggers */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => openAuth('login')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm border border-white/10 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch (err) {
                    console.error('Google sign in error:', err);
                    showToast(getAuthErrorMessage(err));
                    openAuth('login');
                  }
                }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Or Continue with Google</span>
              </button>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-5xl w-full text-left relative z-10">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-2 hover:border-blue-500/30 transition">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Daily Time-Blocking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adaptive timeline with actual duration tracking and live schedule adjustment.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-2 hover:border-emerald-500/30 transition">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Wifi className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Cloud Firestore Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seamless real-time synchronization across all your web and mobile devices.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-2 hover:border-amber-500/30 transition">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Conflict Detection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated detection of overlapping activities and weekly habit goal shortfalls.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-2 hover:border-purple-500/30 transition">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Timed Notifications</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Advance alerts and quiet-hours protection so you never miss an essential habit.
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* Authenticated Routine App */
        <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 grow space-y-6">
          {activeTab === 'today' && (
            <>
              {/* Active Routine Card */}
              <CurrentActivityCard
                occurrences={occurrences}
                onUpdateStatus={handleUpdateStatus}
                onOpenEditor={handleEditOccurrence}
              />

              {/* Conflict & Goal Advisory Banner */}
              <ConflictBanner
                conflicts={conflicts}
                onOpenActivity={handleOpenActivityByTemplateId}
              />

              {/* Schedule Timeline */}
              <TodayTimeline
                occurrences={occurrences}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onUpdateStatus={handleUpdateStatus}
                onOpenCreate={handleOpenCreate}
                onEdit={handleEditOccurrence}
                onDuplicate={handleDuplicateOccurrence}
                onDelete={handleDeleteOccurrence}
              />
            </>
          )}

          {activeTab === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              templates={templates}
              overrides={overrides}
              logs={logs}
              goals={goals}
              onSelectDate={setSelectedDate}
              onOpenActivity={handleEditOccurrence}
              onSwitchToDay={() => setActiveTab('today')}
            />
          )}

          {activeTab === 'month' && (
            <MonthView
              selectedDate={selectedDate}
              templates={templates}
              overrides={overrides}
              logs={logs}
              goals={goals}
              onSelectDate={setSelectedDate}
              onSwitchToDay={() => setActiveTab('today')}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              selectedDate={selectedDate}
              templates={templates}
              overrides={overrides}
              logs={logs}
              goals={goals}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab userId={userId} onDataReset={loadData} />
          )}
        </main>
      )}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Modals & Dialogs (Active when authenticated) */}
      {isAuthenticated && (
        <>
          <ConflictResolverModal
            conflicts={syncConflicts}
            onResolve={handleResolveConflict}
            onDismiss={() => setSyncConflicts([])}
          />

          <ActivityEditorDialog
            isOpen={editorOpen}
            initialOccurrence={editingOccurrence}
            selectedDate={selectedDate}
            userId={userId}
            onSave={handleSaveActivity}
            onDelete={handleDeleteTemplateFromEditor}
            onClose={() => setEditorOpen(false)}
          />

          <RecurrenceEditScopeDialog
            isOpen={scopeDialogOpen}
            activityTitle={pendingTemplateData?.title || ''}
            date={selectedDate}
            onSelectScope={handleSelectScope}
            onCancel={() => {
              setScopeDialogOpen(false);
              setPendingTemplateData(null);
            }}
          />

          <QuickLogModal
            isOpen={quickLogOpen}
            occurrence={quickLogOccurrence}
            onSave={(occ, status, extra) => {
              handleUpdateStatus(occ, status, extra);
            }}
            onClose={() => setQuickLogOpen(false)}
          />
        </>
      )}
    </div>
  );
}
