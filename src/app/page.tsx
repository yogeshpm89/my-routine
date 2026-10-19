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
import { getTodayDateString, addDays, getDayOfWeek, calculateDuration } from '@/lib/time-utils';
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
import { OccurrenceDeleteScopeDialog } from '@/components/routine/occurrence-delete-scope-dialog';
import { QuickLogModal } from '@/components/routine/quick-log-modal';
import { MediaPlayerModal } from '@/components/media/media-player-modal';
import { AiActionConfig } from '@/types/ai';
import { AiActionRepository } from '@/lib/repositories/ai-action-repository';
import { AiActionsHub } from '@/components/ai/ai-actions-hub';
import { AiExecutionDialog } from '@/components/ai/ai-execution-dialog';
import { UpdateManager } from '@/lib/updates/update-manager';
import { AppUpdateManifest } from '@/types/updates';
import { InAppUpdateModal } from '@/components/updates/in-app-update-modal';
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
  Menu,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/auth-modal';
import { canSyncWithFirestore } from '@/lib/firebase/config';
import { MobileDrawer } from '@/components/navigation/mobile-drawer';

export default function RoutineApp() {
  const { user, isDemoMode, loading: authLoading, signInWithGoogle, continueAsGuest, signOut } = useAuth();
  const userId = user?.uid || '';
  const isAuthenticated = Boolean(user);
  const isCloudSynced = Boolean(user && canSyncWithFirestore(userId));

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('register');

  const [selectedDate, setSelectedDate] = useState<string>('2026-10-15');
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'ai' | 'analytics' | 'settings'>('today');

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetDeleteOccurrence, setTargetDeleteOccurrence] = useState<ActivityOccurrence | null>(null);

  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogOccurrence, setQuickLogOccurrence] = useState<ActivityOccurrence | null>(null);

  // In-app media player state
  const [activeMediaOccurrence, setActiveMediaOccurrence] = useState<ActivityOccurrence | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // AI execution dialog state
  const [executingAiAction, setExecutingAiAction] = useState<AiActionConfig | null>(null);
  const [executingRoutineTitle, setExecutingRoutineTitle] = useState<string>('');
  const [aiExecutionDialogOpen, setAiExecutionDialogOpen] = useState(false);

  // In-app update state
  const [updateManifest, setUpdateManifest] = useState<AppUpdateManifest | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState('1.0.0');
  const [isCriticalUpdate, setIsCriticalUpdate] = useState(false);

  // Auto-check for updates on launch
  useEffect(() => {
    let isMounted = true;
    const checkUpdates = async () => {
      try {
        const info = await UpdateManager.getCurrentVersionInfo();
        if (!isMounted) return;
        setCurrentAppVersion(info.version);

        const prefs = UpdateManager.getPreferences();
        if (!prefs.autoCheckOnLaunch) return;

        const result = await UpdateManager.checkForUpdates(false);
        if (!isMounted) return;

        if (result.isUpdateAvailable && result.manifest) {
          const isDismissed = UpdateManager.isVersionDismissed(result.manifest.version);
          if (result.isCritical || !isDismissed) {
            setUpdateManifest(result.manifest);
            setIsCriticalUpdate(result.isCritical);
            setUpdateModalOpen(true);
          }
        }
      } catch (err) {
        console.warn('Silent auto-update check error:', err);
      }
    };

    const timer = setTimeout(checkUpdates, 2000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

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

  // Load routine data fallback
  const loadData = useCallback(async () => {
    if (authLoading || !userId) return;
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
  }, [userId, selectedDate, authLoading]);

  // Real-time Firestore Subscriptions & Reactive Cache
  useEffect(() => {
    if (authLoading || !userId) return;

    // Immediately load cached data for 0ms initial render
    setTemplates(RoutineRepository.getLocalTemplates(userId));
    setOverrides(OverrideRepository.getLocalOverrides(userId));
    setLogs(LogRepository.getLocalLogs(userId));
    setGoals(GoalRepository.getLocalGoals(userId));
    setIsLoading(false);

    if (!isCloudSynced) return;

    // Attach real-time onSnapshot listeners to all 4 Firestore subcollections
    const unsubTemplates = RoutineRepository.subscribeTemplates(userId, (newTemplates) => {
      setTemplates(newTemplates);
    });

    const unsubOverrides = OverrideRepository.subscribeOverrides(userId, (newOverrides) => {
      setOverrides(newOverrides);
    });

    const unsubLogs = LogRepository.subscribeLogs(userId, (newLogs) => {
      setLogs(newLogs);
    });

    const unsubGoals = GoalRepository.subscribeGoals(userId, (newGoals) => {
      setGoals(newGoals);
    });

    const unsubConflicts = SyncEngine.subscribeConflicts(setSyncConflicts);
    const unsubSyncState = SyncEngine.subscribeSync((state) => {
      if (state === 'synced') {
        const curTemplates = RoutineRepository.getLocalTemplates(userId);
        const curOverrides = OverrideRepository.getLocalOverrides(userId);
        const curLogs = LogRepository.getLocalLogs(userId);
        const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
        NotificationManager.reconcileNotifications(userId, curTemplates, curOverrides, prefs, curLogs);
      }
    });

    return () => {
      unsubTemplates();
      unsubOverrides();
      unsubLogs();
      unsubGoals();
      unsubConflicts();
      unsubSyncState();
    };
  }, [userId, authLoading, isAuthenticated]);

  const handleResolveConflict = async (
    conflictId: string,
    resolution: 'keep_local' | 'accept_remote'
  ) => {
    await SyncEngine.resolveConflict(userId, conflictId, resolution);
    showToast('Sync conflict resolved');
  };

  const handleSaveGoal = async (goal: GoalTarget) => {
    await GoalRepository.saveGoal(goal);
    showToast(`Saved goal target "${goal.title}" to Firebase`);
  };

  const handleDeleteGoal = async (goalId: string) => {
    await GoalRepository.deleteGoal(userId, goalId);
    showToast('Deleted goal target');
  };

  // Reconcile native 72-hour notifications upon routine updates and logs
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    NotificationManager.initialize(userId);
    if (templates.length > 0) {
      const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
      NotificationManager.reconcileNotifications(userId, templates, overrides, prefs, logs);
    }
  }, [userId, templates, overrides, logs, isAuthenticated]);

  // Refresh rolling 72-hour notifications when app gains focus or returns from background
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const handleResumeOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const curTemplates = RoutineRepository.getLocalTemplates(userId);
        const curOverrides = OverrideRepository.getLocalOverrides(userId);
        const curLogs = LogRepository.getLocalLogs(userId);
        const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
        NotificationManager.reconcileNotifications(userId, curTemplates, curOverrides, prefs, curLogs);
      }
    };

    document.addEventListener('visibilitychange', handleResumeOrFocus);
    window.addEventListener('focus', handleResumeOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleResumeOrFocus);
      window.removeEventListener('focus', handleResumeOrFocus);
    };
  }, [userId, isAuthenticated]);

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

    const statusAction =
      status === 'in_progress'
        ? 'Started'
        : status === 'skipped'
        ? 'Skipped'
        : status === 'completed'
        ? 'Completed'
        : status === 'pending'
        ? 'Reset to pending'
        : `Marked as ${status.replace('_', ' ')}`;
    showToast(`${statusAction}: "${occurrence.title}"`);
  };

  // Step Checklist Toggle Handler
  const handleToggleStep = async (occurrence: ActivityOccurrence, stepId: string) => {
    const updated = await LogRepository.toggleStep(
      userId,
      selectedDate,
      occurrence.templateId,
      stepId
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

    const isDone = updated.completedStepIds?.includes(stepId);
    showToast(isDone ? 'Step completed ✓' : 'Step unchecked');
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
        modifiedMedia: pendingTemplateData.media,
        modifiedSteps: pendingTemplateData.steps,
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

  const handleDeleteOccurrence = (occurrence: ActivityOccurrence) => {
    setTargetDeleteOccurrence(occurrence);
    setDeleteDialogOpen(true);
  };

  const handleExecuteAiForOccurrence = async (occ: ActivityOccurrence) => {
    if (!occ.aiActionId) return;
    try {
      const action = await AiActionRepository.getAction(userId, occ.aiActionId);
      if (action) {
        setExecutingAiAction(action);
        setExecutingRoutineTitle(occ.title);
        setAiExecutionDialogOpen(true);
      } else {
        showToast('Associated AI action not found');
      }
    } catch (err) {
      console.error('Failed to load AI action for execution:', err);
      showToast('Could not load AI action');
    }
  };

  const handleDeleteTemplateFromEditor = (templateId: string) => {
    const target =
      (editingOccurrence && editingOccurrence.templateId === templateId ? editingOccurrence : null) ||
      occurrences.find((o) => o.templateId === templateId) ||
      (() => {
        const tmpl = templates.find((t) => t.id === templateId);
        if (!tmpl) return null;
        return {
          occurrenceId: `occ_${templateId}_${selectedDate}`,
          templateId,
          date: selectedDate,
          startTime: tmpl.startTime,
          endTime: tmpl.endTime,
          durationMinutes: calculateDuration(tmpl.startTime, tmpl.endTime),
          title: tmpl.title,
          category: tmpl.category,
          status: 'pending' as const,
          isFixed: tmpl.isFixed,
          color: tmpl.color,
          media: tmpl.media,
          steps: tmpl.steps || [],
          completedStepIds: [],
          notes: tmpl.notes,
          notifications: tmpl.notifications,
          hasOverride: false,
          isCancelled: false,
          isPostponed: false,
          template: tmpl,
        };
      })();

    if (target) {
      setEditorOpen(false);
      setTargetDeleteOccurrence(target);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmCancelOccurrence = async (occurrence: ActivityOccurrence) => {
    try {
      const override: OccurrenceOverride = {
        id: `override_${occurrence.templateId}_${occurrence.date}`,
        userId,
        templateId: occurrence.templateId,
        date: occurrence.date,
        isCancelled: true,
        isPostponed: false,
        updatedAt: Date.now(),
      };
      await OverrideRepository.saveOverride(override);
      showToast(`Cancelled "${occurrence.title}" for ${occurrence.date}`);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to cancel occurrence:', err);
      throw err;
    }
  };

  const handleConfirmArchiveRoutine = async (occurrence: ActivityOccurrence) => {
    try {
      await RoutineRepository.archiveTemplate(userId, occurrence.templateId);
      showToast(`Archived "${occurrence.title}"`);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to archive routine:', err);
      throw err;
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
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-md shadow-blue-500/10 flex items-center justify-center p-1 shrink-0">
              <img
                src="/logo.png"
                alt="My Routine Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                My Routine
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-blue-400 font-medium">Asia/Kolkata</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Adaptive Routine Engine</span>
              </div>
            </div>
          </div>

          {isAuthenticated ? (
            <>
              {/* Desktop View Tabs (hidden on mobile) */}
              <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5">
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[36px] ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Status & Profile Pill */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                {isCloudSynced ? (
                  <div
                    title="Real-time Cloud Firestore Active"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-slate-900 border border-emerald-500/30 shadow-sm shadow-emerald-500/10"
                  >
                    <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-[11px] hidden sm:inline">
                      {user?.isAnonymous ? 'Cloud Guest' : 'Cloud Synced'}
                    </span>
                  </div>
                ) : (
                  <div
                    title="Local Storage Mode"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-slate-900 border border-amber-500/30"
                  >
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 text-[11px] hidden sm:inline">Local Only</span>
                  </div>
                )}

                {selectedDate !== getTodayDateString('Asia/Kolkata') && (
                  <button
                    onClick={() => setSelectedDate(getTodayDateString('Asia/Kolkata'))}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition cursor-pointer min-h-[32px]"
                  >
                    Today
                  </button>
                )}

                <div className="hidden sm:block">
                  <UserMenu />
                </div>

                {/* Mobile Drawer Hamburger Button */}
                <button
                  type="button"
                  id="btn-open-mobile-menu"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="md:hidden flex items-center justify-center p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-white/10 active:scale-95 transition cursor-pointer min-w-[42px] min-h-[42px]"
                  aria-label="Open Navigation Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
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
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-2.5 bg-slate-900/90 border border-white/10 shadow-2xl shadow-blue-500/20 flex items-center justify-center backdrop-blur-md">
              <img
                src="/logo.png"
                alt="My Routine Logo"
                className="w-full h-full object-contain"
              />
            </div>

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

              <button
                type="button"
                onClick={() => continueAsGuest()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm border border-white/10 transition cursor-pointer"
              >
                <span>Continue as Guest</span>
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
        <main className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8 pb-28 md:pb-10 grow space-y-5 sm:space-y-6">
          {activeTab === 'today' && (
            <>
              {/* Active Routine Card */}
              <CurrentActivityCard
                occurrences={occurrences}
                onUpdateStatus={handleUpdateStatus}
                onOpenEditor={handleEditOccurrence}
                onPlayMedia={(occ, idx = 0) => {
                  setActiveMediaOccurrence(occ);
                  setActiveMediaIndex(idx);
                }}
                onExecuteAi={handleExecuteAiForOccurrence}
                onToggleStep={handleToggleStep}
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
                onPlayMedia={(occ, idx = 0) => {
                  setActiveMediaOccurrence(occ);
                  setActiveMediaIndex(idx);
                }}
                onExecuteAi={handleExecuteAiForOccurrence}
                onToggleStep={handleToggleStep}
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

          {activeTab === 'ai' && (
            <AiActionsHub userId={userId} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              userId={userId}
              selectedDate={selectedDate}
              templates={templates}
              overrides={overrides}
              logs={logs}
              goals={goals}
              onSaveGoal={handleSaveGoal}
              onDeleteGoal={handleDeleteGoal}
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

          <OccurrenceDeleteScopeDialog
            isOpen={deleteDialogOpen}
            occurrence={targetDeleteOccurrence}
            onCancelOccurrence={handleConfirmCancelOccurrence}
            onArchiveRoutine={handleConfirmArchiveRoutine}
            onClose={() => {
              setDeleteDialogOpen(false);
              setTargetDeleteOccurrence(null);
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

          <MediaPlayerModal
            isOpen={Boolean(activeMediaOccurrence)}
            occurrence={activeMediaOccurrence}
            initialMediaIndex={activeMediaIndex}
            onClose={() => setActiveMediaOccurrence(null)}
          />

          <AiExecutionDialog
            isOpen={aiExecutionDialogOpen}
            action={executingAiAction}
            routineTitle={executingRoutineTitle}
            selectedDate={selectedDate}
            userId={userId}
            onClose={() => {
              setAiExecutionDialogOpen(false);
              setExecutingAiAction(null);
            }}
          />

          <InAppUpdateModal
            isOpen={updateModalOpen}
            manifest={updateManifest}
            currentVersion={currentAppVersion}
            isCritical={isCriticalUpdate}
            onClose={() => setUpdateModalOpen(false)}
            onDismissUpdate={(v) => {
              UpdateManager.dismissVersion(v);
              setUpdateModalOpen(false);
            }}
          />

          {/* Mobile Bottom Navigation Dock */}
          <nav
            aria-label="Mobile Navigation"
            className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 px-2 pt-1.5 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
          >
            <div className="grid grid-cols-5 items-center gap-1 max-w-md mx-auto">
              {[
                { id: 'today', label: 'Day', icon: Clock },
                { id: 'week', label: 'Week', icon: CalendarDays },
                { id: 'month', label: 'Month', icon: Calendar },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'menu', label: 'Menu', icon: Menu },
              ].map((tab) => {
                const Icon = tab.icon;
                const isMenuTab = tab.id === 'menu';
                const isActive = isMenuTab
                  ? (mobileDrawerOpen || activeTab === 'settings' || activeTab === 'ai')
                  : activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    id={`nav-tab-${tab.id}`}
                    onClick={() => {
                      if (isMenuTab) {
                        setMobileDrawerOpen(true);
                      } else {
                        setActiveTab(tab.id as any);
                      }
                    }}
                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
                      isActive
                        ? 'text-blue-400 font-bold bg-blue-500/10'
                        : 'text-slate-400 hover:text-slate-200 active:bg-slate-800/40'
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        className={`w-5 h-5 transition-transform ${
                          isActive ? 'scale-110 text-blue-400' : ''
                        }`}
                      />
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] mt-1 tracking-tight leading-none ${
                        isActive ? 'text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Mobile Navigation Drawer */}
          <MobileDrawer
            isOpen={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setMobileDrawerOpen(false);
            }}
            onOpenCreate={() => {
              setMobileDrawerOpen(false);
              handleOpenCreate();
            }}
            onSyncNow={async () => {
              if (isCloudSynced && userId) {
                showToast('Syncing with Cloud Firestore...');
                await SyncEngine.syncNow(userId);
                showToast('Cloud sync complete!');
              } else {
                showToast('Guest mode: routines stored locally on device.');
              }
            }}
            onOpenAuth={(mode) => {
              setMobileDrawerOpen(false);
              openAuth(mode);
            }}
            user={user}
            isDemoMode={isDemoMode}
            onSignOut={async () => {
              setMobileDrawerOpen(false);
              await signOut();
            }}
          />
        </>
      )}
    </div>
  );
}
