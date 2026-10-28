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
  ReplacementActivityDetails,
  RescheduleDetails,
} from '@/types/routine';
import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { OverrideRepository } from '@/lib/repositories/override-repository';
import { LogRepository } from '@/lib/repositories/log-repository';
import { GoalRepository } from '@/lib/repositories/goal-repository';
import { GoalProgressRepository } from '@/lib/repositories/goal-progress-repository';
import { GoalProgressEntry, GoalTrackingUnit } from '@/types/goal-progress';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { detectScheduleConflicts } from '@/lib/conflict-detector';
import {
  getTodayDateString,
  addDays,
  getDayOfWeek,
  calculateDuration,
  formatDisplayDate,
  timeToMinutes,
  getCurrentTimeString,
} from '@/lib/time-utils';
import { CurrentActivityCard } from '@/components/routine/current-activity-card';
import { TodayTimeline } from '@/components/routine/today-timeline';
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
import { HolidayService } from '@/lib/holidays/holiday-service';
import { SkipCompleteRoutineModal } from '@/components/routine/skip-complete-routine-modal';
import { ReplaceBlockDialog } from '@/components/routine/replace-block-dialog';
import { LifeGoal, GoalTrackedItem, GoalExperienceEntry } from '@/types/goals';
import { LifeGoalRepository } from '@/lib/repositories/life-goal-repository';
import { GoalsDashboard } from '@/components/goals/goals-dashboard';
import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { DayTemplateRepository } from '@/lib/repositories/day-template-repository';
import { DayTemplateResolver } from '@/lib/templates/day-template-resolver';
import { TemplatesDashboard } from '@/components/templates/templates-dashboard';
import { syncOccurrencesToWidget } from '@/lib/widget/routine-widget';
import { SpeedometerModal } from '@/components/speedometer/speedometer-modal';
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
  Target,
  Gauge,
  Layers,
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
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'goals' | 'templates' | 'ai' | 'analytics' | 'settings'>('today');

  useEffect(() => {
    setSelectedDate(getTodayDateString('Asia/Kolkata'));
  }, []);

  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [overrides, setOverrides] = useState<OccurrenceOverride[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [goals, setGoals] = useState<GoalTarget[]>([]);
  const [goalProgress, setGoalProgress] = useState<GoalProgressEntry[]>([]);
  const [lifeGoals, setLifeGoals] = useState<LifeGoal[]>([]);
  const [dayTemplates, setDayTemplates] = useState<DayRoutineTemplate[]>([]);
  const [weeklyPlanner, setWeeklyPlanner] = useState<WeeklyPlannerConfig | null>(null);
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

  // Skip complete routine state
  const [skipRoutineModalOpen, setSkipRoutineModalOpen] = useState(false);

  // Replace block dialog state
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replacingOccurrence, setReplacingOccurrence] = useState<ActivityOccurrence | null>(null);

  // Speedometer modal state
  const [speedometerOpen, setSpeedometerOpen] = useState(false);

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
      const [tList, oList, lList, gList, lgList, dtList, pln, gpList] = await Promise.all([
        RoutineRepository.getTemplates(userId),
        OverrideRepository.getOverridesForDate(userId, selectedDate),
        LogRepository.getLogsForDate(userId, selectedDate),
        GoalRepository.getGoals(userId),
        LifeGoalRepository.getLifeGoals(userId),
        DayTemplateRepository.getTemplates(userId),
        DayTemplateRepository.getWeeklyPlanner(userId),
        GoalProgressRepository.getProgressEntries(userId),
      ]);
      setTemplates(tList);
      setOverrides(oList);
      setLogs(lList);
      setGoals(gList);
      setLifeGoals(lgList);
      setDayTemplates(dtList);
      setWeeklyPlanner(pln);
      setGoalProgress(gpList);
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
    setGoalProgress(GoalProgressRepository.getLocalProgress(userId));
    setLifeGoals(LifeGoalRepository.getLocalLifeGoals(userId));
    setDayTemplates(DayTemplateRepository.getLocalTemplates(userId));
    setWeeklyPlanner(DayTemplateRepository.getLocalWeeklyPlanner(userId));
    setIsLoading(false);

    if (!isCloudSynced) return;

    // Attach real-time onSnapshot listeners to Firestore subcollections
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

    const unsubGoalProgress = GoalProgressRepository.subscribeProgress(userId, (newEntries) => {
      setGoalProgress(newEntries);
    });

    const unsubLifeGoals = LifeGoalRepository.subscribeLifeGoals(userId, (newLifeGoals) => {
      setLifeGoals(newLifeGoals);
    });

    const unsubDayTemplates = DayTemplateRepository.subscribeTemplates(userId, (newDayTemplates) => {
      setDayTemplates(newDayTemplates);
    });

    const unsubWeeklyPlanner = DayTemplateRepository.subscribeWeeklyPlanner(userId, (newPlanner) => {
      setWeeklyPlanner(newPlanner);
    });

    const unsubConflicts = SyncEngine.subscribeConflicts(setSyncConflicts);
    const unsubSyncState = SyncEngine.subscribeSync((state) => {
      if (state === 'synced') {
        const curTemplates = RoutineRepository.getLocalTemplates(userId);
        const curOverrides = OverrideRepository.getLocalOverrides(userId);
        const curLogs = LogRepository.getLocalLogs(userId);
        const curDayTemplates = DayTemplateRepository.getLocalTemplates(userId);
        const curPlanner = DayTemplateRepository.getLocalWeeklyPlanner(userId);
        const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
        NotificationManager.reconcileNotifications(
          userId,
          curTemplates,
          curOverrides,
          prefs,
          curLogs,
          curDayTemplates,
          curPlanner
        );
      }
    });

    return () => {
      unsubTemplates();
      unsubOverrides();
      unsubLogs();
      unsubGoals();
      unsubGoalProgress();
      unsubLifeGoals();
      unsubDayTemplates();
      unsubWeeklyPlanner();
      unsubConflicts();
      unsubSyncState();
    };
  }, [userId, authLoading, isAuthenticated, isCloudSynced]);

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

  const handleRecordGoalProgress = async (params: {
    goalId: string;
    amount: number;
    unit: GoalTrackingUnit;
    durationMinutes: number;
    notes?: string;
    source?: 'manual' | 'quick_add';
  }) => {
    if (!userId) return;
    const entry = await GoalProgressRepository.addEntry({
      userId,
      goalId: params.goalId,
      date: selectedDate,
      amount: params.amount,
      unit: params.unit,
      durationMinutes: params.durationMinutes,
      notes: params.notes,
      source: params.source,
    });
    setGoalProgress((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)]);
  };

  const handleDeleteGoalProgress = async (entryId: string) => {
    if (!userId) return;
    await GoalProgressRepository.deleteEntry(userId, entryId);
    setGoalProgress((prev) => prev.filter((e) => e.id !== entryId));
    showToast('Progress entry deleted');
  };

  const handleUndoLastGoalProgress = async (goalId: string, date: string) => {
    if (!userId) return;
    const undone = await GoalProgressRepository.undoLastEntry(userId, goalId, date);
    if (undone) {
      setGoalProgress((prev) => prev.filter((e) => e.id !== undone.id));
      showToast('Last progress entry undone');
    }
  };

  const handleSaveLifeGoal = async (goal: LifeGoal) => {
    const updated = await LifeGoalRepository.saveGoal(goal);
    setLifeGoals((prev) => {
      const idx = prev.findIndex((g) => g.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });
    showToast(`Saved goal "${goal.title}" ✓`);
  };

  const handleDeleteLifeGoal = async (goalId: string) => {
    await LifeGoalRepository.deleteGoal(userId, goalId);
    setLifeGoals((prev) => prev.filter((g) => g.id !== goalId));
    showToast('Deleted life goal');
  };

  const handleLogGoalProgress = async (
    goalId: string,
    valueChange: number,
    note: string,
    date: string
  ) => {
    const updated = await LifeGoalRepository.logProgress(userId, goalId, valueChange, note, date);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast(updated.status === 'completed' ? '🎉 Goal accomplished!' : 'Progress recorded ✓');
    }
  };

  const handleToggleGoalMilestone = async (goalId: string, milestoneId: string) => {
    const updated = await LifeGoalRepository.toggleMilestone(userId, goalId, milestoneId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast(updated.status === 'completed' ? '🎉 All milestones completed!' : 'Milestone updated ✓');
    }
  };

  const handleAddGoalMilestone = async (
    goalId: string,
    data: { title: string; description?: string; targetDate?: string }
  ) => {
    const updated = await LifeGoalRepository.addMilestone(userId, goalId, data);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast('Milestone added ✓');
    }
  };

  const handleDeleteGoalMilestone = async (goalId: string, milestoneId: string) => {
    const updated = await LifeGoalRepository.deleteMilestone(userId, goalId, milestoneId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast('Milestone removed');
    }
  };

  // Life Goal Checklist Handlers
  const handleAddGoalChecklistItem = async (goalId: string, text: string) => {
    const updated = await LifeGoalRepository.addChecklistItem(userId, goalId, text);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast('Checklist task added ✓');
    }
  };

  const handleToggleGoalChecklistItem = async (goalId: string, itemId: string) => {
    const updated = await LifeGoalRepository.toggleChecklistItem(userId, goalId, itemId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
    }
  };

  const handleDeleteGoalChecklistItem = async (goalId: string, itemId: string) => {
    const updated = await LifeGoalRepository.deleteChecklistItem(userId, goalId, itemId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast('Checklist task removed');
    }
  };

  // Life Goal Comments & Reflections Handlers
  const handleAddGoalComment = async (goalId: string, text: string) => {
    const updated = await LifeGoalRepository.addGoalComment(userId, goalId, text);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast('Note added ✓');
    }
  };

  const handleUpdateGoalComment = async (goalId: string, commentId: string, text: string) => {
    const updated = await LifeGoalRepository.updateGoalComment(userId, goalId, commentId, text);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast('Note updated ✓');
    }
  };

  const handleDeleteGoalComment = async (goalId: string, commentId: string) => {
    const updated = await LifeGoalRepository.deleteGoalComment(userId, goalId, commentId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast('Note deleted');
    }
  };

  // Life Goal Activity Tracking Handler
  const handleRecordGoalActivity = async (
    goalId: string,
    data: {
      date: string;
      activityTitle: string;
      durationMinutes: number;
      notes: string;
      templateId?: string;
      incrementProgress: boolean;
    }
  ) => {
    const updated = await LifeGoalRepository.recordActivityForGoal(userId, goalId, data);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast(
        data.incrementProgress
          ? `Recorded activity session & advanced progress (+1 ${updated.unit || 'unit'}) ✓`
          : 'Activity session recorded ✓'
      );
    }
  };

  // Tracked Items Handlers (Books, Courses, Audio Links, Local Paths)
  const handleSaveGoalTrackedItem = async (
    goalId: string,
    itemData: Omit<GoalTrackedItem, 'id' | 'createdAt' | 'updatedAt'>,
    itemId?: string
  ) => {
    let updated: LifeGoal | null;
    if (itemId) {
      updated = await LifeGoalRepository.updateTrackedItem(userId, goalId, itemId, itemData);
    } else {
      updated = await LifeGoalRepository.addTrackedItem(userId, goalId, itemData);
    }
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast(itemId ? 'Item updated ✓' : 'Item added ✓');
    }
  };

  const handleDeleteGoalTrackedItem = async (goalId: string, itemId: string) => {
    const updated = await LifeGoalRepository.deleteTrackedItem(userId, goalId, itemId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('Item deleted');
    }
  };

  const handleUpdateItemProgress = async (
    goalId: string,
    itemId: string,
    currentUnits: number,
    markCompleted?: boolean
  ) => {
    const updated = await LifeGoalRepository.updateItemProgress(
      userId,
      goalId,
      itemId,
      currentUnits,
      markCompleted
    );
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast(markCompleted ? '🎉 Marked as completed!' : 'Progress updated ✓');
    }
  };


  const handleLogItemProgress = async (
    goalId: string,
    itemId: string,
    data: {
      deltaUnits?: number;
      setAbsoluteUnits?: number;
      note?: string;
      date?: string;
      markCompleted?: boolean;
    }
  ) => {
    const res = await LifeGoalRepository.logItemProgress(userId, goalId, itemId, data);
    if (res) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === res.goal.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = res.goal;
          return copy;
        }
        return [...prev, res.goal];
      });
      if (res.completedNow) {
        showToast(`🎉 Completed "${res.updatedItem.title}"!`);
      } else {
        const delta =
          data.deltaUnits !== undefined
            ? data.deltaUnits >= 0
              ? `+${data.deltaUnits}`
              : `${data.deltaUnits}`
            : '';
        showToast(`Progress logged: ${delta} ${res.updatedItem.unitLabel} 📈`);
      }
    }
  };

  const handleUndoGoalProgressLog = async (goalId: string, logId: string) => {
    const updated = await LifeGoalRepository.undoProgressLog(userId, goalId, logId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      showToast('Progress entry undone ↩️');
    }
  };
  // Structured Phases Handlers
  const handleTogglePhaseStatus = async (goalId: string, phaseId: string) => {
    const updated = await LifeGoalRepository.togglePhaseStatus(userId, goalId, phaseId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('Phase status updated ✓');
    }
  };

  const handleAddPhaseTask = async (goalId: string, phaseId: string, text: string) => {
    const updated = await LifeGoalRepository.addPhaseTask(userId, goalId, phaseId, text);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('Step added ✓');
    }
  };

  const handleTogglePhaseTask = async (goalId: string, phaseId: string, taskId: string) => {
    const updated = await LifeGoalRepository.togglePhaseTask(userId, goalId, phaseId, taskId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
    }
  };

  const handleDeletePhaseTask = async (goalId: string, phaseId: string, taskId: string) => {
    const updated = await LifeGoalRepository.deletePhaseTask(userId, goalId, phaseId, taskId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('Step removed');
    }
  };

  // Custom Lists Handlers
  const handleAddNamedList = async (goalId: string, title: string) => {
    const updated = await LifeGoalRepository.addNamedList(userId, goalId, title);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('List added ✓');
    }
  };

  const handleAddListItem = async (goalId: string, listId: string, text: string) => {
    const updated = await LifeGoalRepository.addListItem(userId, goalId, listId, text);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('Task added ✓');
    }
  };

  const handleToggleListItem = async (goalId: string, listId: string, itemId: string) => {
    const updated = await LifeGoalRepository.toggleListItem(userId, goalId, listId, itemId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
    }
  };

  const handleDeleteListItem = async (goalId: string, listId: string, itemId: string) => {
    const updated = await LifeGoalRepository.deleteListItem(userId, goalId, listId, itemId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('Task removed');
    }
  };

  // Experience Journal Handlers
  const handleAddExperience = async (
    goalId: string,
    data: Omit<GoalExperienceEntry, 'id' | 'createdAt'>
  ) => {
    const updated = await LifeGoalRepository.addExperienceEntry(userId, goalId, data);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('Reflection logged ✓');
    }
  };

  const handleDeleteExperience = async (goalId: string, entryId: string) => {
    const updated = await LifeGoalRepository.deleteExperienceEntry(userId, goalId, entryId);
    if (updated) {
      setLifeGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === updated!.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated!;
          return copy;
        }
        return [...prev, updated!];
      });
      showToast('Reflection removed');
    }
  };

  // Day Routine Template & Weekly Planner Handlers
  const handleSaveDayTemplate = async (template: DayRoutineTemplate) => {
    const saved = await DayTemplateRepository.saveTemplate(template);
    setDayTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
    NotificationManager.reconcileNotifications(
      userId,
      templates,
      overrides,
      prefs,
      logs,
      dayTemplates,
      weeklyPlanner || undefined
    );
  };

  const handleDeleteDayTemplate = async (templateId: string) => {
    await DayTemplateRepository.deleteTemplate(userId, templateId);
    setDayTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const handleDuplicateDayTemplate = async (template: DayRoutineTemplate) => {
    const duplicated = await DayTemplateRepository.duplicateTemplate(userId, template.id);
    setDayTemplates((prev) => [...prev, duplicated]);
  };

  const handleSaveWeeklyPlanner = async (config: WeeklyPlannerConfig) => {
    const saved = await DayTemplateRepository.saveWeeklyPlanner(config);
    setWeeklyPlanner(saved);
    const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
    NotificationManager.reconcileNotifications(
      userId,
      templates,
      overrides,
      prefs,
      logs,
      dayTemplates,
      saved
    );
  };

  const handleQuickSwitchTodayTemplate = async (templateId: string) => {
    if (!userId) return;
    const updated = await DayTemplateRepository.setDateOverride(userId, selectedDate, templateId);
    setWeeklyPlanner(updated);
    showToast('Applied routine template to date ✓');
    const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
    NotificationManager.reconcileNotifications(
      userId,
      templates,
      overrides,
      prefs,
      logs,
      dayTemplates,
      updated
    );
  };

  // Reconcile native 72-hour notifications upon routine updates and logs
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    NotificationManager.initialize(userId);
    if (templates.length > 0 || dayTemplates.length > 0) {
      const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
      NotificationManager.reconcileNotifications(
        userId,
        templates,
        overrides,
        prefs,
        logs,
        dayTemplates,
        weeklyPlanner || undefined
      );
    }
  }, [userId, templates, overrides, logs, dayTemplates, weeklyPlanner, isAuthenticated]);

  // Refresh rolling 72-hour notifications when app gains focus or returns from background
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const handleResumeOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const curTemplates = RoutineRepository.getLocalTemplates(userId);
        const curOverrides = OverrideRepository.getLocalOverrides(userId);
        const curLogs = LogRepository.getLocalLogs(userId);
        const curDayTemplates = DayTemplateRepository.getLocalTemplates(userId);
        const curPlanner = DayTemplateRepository.getLocalWeeklyPlanner(userId);
        const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
        NotificationManager.reconcileNotifications(
          userId,
          curTemplates,
          curOverrides,
          prefs,
          curLogs,
          curDayTemplates,
          curPlanner
        );
      }
    };

    document.addEventListener('visibilitychange', handleResumeOrFocus);
    window.addEventListener('focus', handleResumeOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleResumeOrFocus);
      window.removeEventListener('focus', handleResumeOrFocus);
    };
  }, [userId, isAuthenticated]);

  // Resolve active day template and constituent blocks according to precedence
  const resolvedTemplateInfo =
    weeklyPlanner && dayTemplates.length > 0
      ? DayTemplateResolver.resolveTemplateForDate(selectedDate, weeklyPlanner, dayTemplates)
      : null;
  const activeDayTemplate = resolvedTemplateInfo?.template || null;

  const resolvedBlocks =
    weeklyPlanner && dayTemplates.length > 0
      ? DayTemplateResolver.resolveBlocksForDate(selectedDate, weeklyPlanner, dayTemplates)
      : templates;

  // Generate computed occurrences for the day
  const occurrences = generateDailyOccurrences(
    resolvedBlocks.length > 0 ? resolvedBlocks : templates,
    overrides,
    logs,
    selectedDate
  );
  const dayOfWeek = getDayOfWeek(selectedDate);
  const conflicts = detectScheduleConflicts(occurrences, goals, dayOfWeek);
  const dayInfo = HolidayService.getDayTypeInfo(userId, selectedDate);

  // Sync current routine metrics to Android Home Screen Widget
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const todayStr = getTodayDateString('Asia/Kolkata');
    const todayBlocks =
      weeklyPlanner && dayTemplates.length > 0
        ? DayTemplateResolver.resolveBlocksForDate(todayStr, weeklyPlanner, dayTemplates)
        : templates;
    const todayOccurrences =
      selectedDate === todayStr
        ? occurrences
        : generateDailyOccurrences(todayBlocks.length > 0 ? todayBlocks : templates, overrides, logs, todayStr);

    syncOccurrencesToWidget(todayOccurrences);
  }, [occurrences, selectedDate, templates, overrides, logs, weeklyPlanner, dayTemplates]);

  // Skip complete routine handler
  const handleSkipCompleteRoutine = async (
    scope: 'all' | 'remaining',
    reason: string,
    markAsHoliday: boolean,
    customHolidayName?: string
  ) => {
    const targetOccurrences =
      scope === 'remaining'
        ? occurrences.filter((o) => o.log?.status !== 'completed' && o.log?.status !== 'skipped')
        : occurrences;

    if (targetOccurrences.length === 0) {
      showToast('No activities to skip for this day');
      return;
    }

    if (markAsHoliday) {
      const holidayName = customHolidayName || reason.split(':')[0] || 'Holiday';
      HolidayService.addHoliday(userId, {
        date: selectedDate,
        name: holidayName,
        isCustom: true,
      });
    }

    const templateIds = targetOccurrences.map((o) => o.templateId);
    const updated = await LogRepository.bulkUpdateStatus(
      userId,
      selectedDate,
      templateIds,
      'skipped',
      { completionNotes: reason }
    );

    setLogs((prev) => {
      const updatedMap = new Map(updated.map((l) => [l.id, l]));
      const result = prev.map((l) => updatedMap.get(l.id) || l);
      for (const l of updated) {
        if (!prev.some((p) => p.id === l.id)) {
          result.push(l);
        }
      }
      return result;
    });

    showToast(`Skipped complete routine for ${formatDisplayDate(selectedDate)} (${reason})`);
    setSkipRoutineModalOpen(false);
  };

  // Resume complete routine handler (unskip all skipped activities)
  const handleResumeCompleteRoutine = async () => {
    const skippedOccurrences = occurrences.filter((o) => o.log?.status === 'skipped');
    if (skippedOccurrences.length === 0) {
      showToast('No skipped activities to resume');
      return;
    }

    const templateIds = skippedOccurrences.map((o) => o.templateId);
    const updated = await LogRepository.bulkResetToPending(userId, selectedDate, templateIds);

    setLogs((prev) => {
      const updatedMap = new Map(updated.map((l) => [l.id, l]));
      const result = prev.map((l) => updatedMap.get(l.id) || l);
      for (const l of updated) {
        if (!prev.some((p) => p.id === l.id)) {
          result.push(l);
        }
      }
      return result;
    });

    showToast(`Resumed complete routine for ${formatDisplayDate(selectedDate)}`);
  };

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

    // Auto-sync completed daily routine activities to matching life goals
    if (status === 'completed') {
      const duration = occurrence.durationMinutes || calculateDuration(occurrence.startTime, occurrence.endTime);
      LifeGoalRepository.syncCompletedRoutineToLifeGoals(
        userId,
        selectedDate,
        occurrence.templateId,
        occurrence.title,
        duration,
        occurrence.log?.completionNotes || '',
        {
          isReplacement: occurrence.isReplacement,
          linkedGoalId: occurrence.linkedGoalId,
          replacesTemplateId: occurrence.replacesTemplateId,
          isReplaced: occurrence.isReplaced,
        }
      ).then((updatedGoals) => {
        if (updatedGoals.length > 0) {
          setLifeGoals((prev) => {
            const copy = [...prev];
            for (const ug of updatedGoals) {
              const idx = copy.findIndex((g) => g.id === ug.id);
              if (idx >= 0) copy[idx] = ug;
              else copy.push(ug);
            }
            return copy;
          });
          showToast(`Synced activity to ${updatedGoals.length} life goal(s) ✓`);
        }
      }).catch((err) => {
        console.warn('Failed to sync completed routine to life goals:', err);
      });
    }

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

  // Activity Comment Handlers
  const handleAddComment = async (occurrence: ActivityOccurrence, text: string) => {
    const updated = await LogRepository.addComment(
      userId,
      selectedDate,
      occurrence.templateId,
      text
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

    showToast('Note added ✓');
  };

  const handleUpdateComment = async (
    occurrence: ActivityOccurrence,
    commentId: string,
    text: string
  ) => {
    const updated = await LogRepository.updateComment(
      userId,
      selectedDate,
      occurrence.templateId,
      commentId,
      text
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

    showToast('Note updated ✓');
  };

  const handleDeleteComment = async (occurrence: ActivityOccurrence, commentId: string) => {
    const updated = await LogRepository.deleteComment(
      userId,
      selectedDate,
      occurrence.templateId,
      commentId
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

    showToast('Note deleted');
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

  const handleOpenReplace = (occurrence: ActivityOccurrence) => {
    setReplacingOccurrence(occurrence);
    setReplaceDialogOpen(true);
  };

  const handleConfirmReplacement = async (data: {
    originalOccurrence: ActivityOccurrence;
    replacement: {
      title: string;
      category: any;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      reason?: string;
      linkedGoalId?: string;
      isTemporary: boolean;
      color?: string;
    };
    partialDurationMinutes?: number;
    rescheduleOriginal?: {
      date: string;
      startTime: string;
      endTime: string;
    };
    scope: EditScope;
  }) => {
    if (!replacingOccurrence || !userId) return;

    try {
      const replacementDetails: ReplacementActivityDetails = {
        id: `repl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: data.replacement.title,
        category: data.replacement.category,
        startTime: data.replacement.startTime,
        endTime: data.replacement.endTime,
        durationMinutes: data.replacement.durationMinutes,
        isTemporary: data.replacement.isTemporary,
        linkedGoalId: data.replacement.linkedGoalId,
        reason: data.replacement.reason,
        color: data.replacement.color,
      };

      const rescheduleDetails: RescheduleDetails | undefined = data.rescheduleOriginal
        ? {
            date: data.rescheduleOriginal.date,
            startTime: data.rescheduleOriginal.startTime,
            endTime: data.rescheduleOriginal.endTime,
          }
        : undefined;

      if (data.scope === 'future_occurrences') {
        const yesterday = addDays(selectedDate, -1);
        const oldTemplate = {
          ...replacingOccurrence.template,
          recurrence: {
            ...replacingOccurrence.template.recurrence,
            endDate: yesterday,
          },
        };
        await RoutineRepository.saveTemplate(oldTemplate);

        const newTemplateId = `template_${Date.now()}_repl`;
        const newTemplate: RoutineTemplate = {
          ...replacingOccurrence.template,
          id: newTemplateId,
          title: data.replacement.title,
          category: data.replacement.category,
          startTime: data.replacement.startTime,
          endTime: data.replacement.endTime,
          color: data.replacement.color || replacingOccurrence.template.color,
          notes: data.replacement.reason
            ? `Replaced recurring routine: ${data.replacement.reason}`
            : replacingOccurrence.template.notes,
          recurrence: {
            ...replacingOccurrence.template.recurrence,
            startDate: selectedDate,
          },
          updatedAt: Date.now(),
        };
        await RoutineRepository.saveTemplate(newTemplate);

        if (data.replacement.linkedGoalId) {
          const targetGoal = lifeGoals.find((g) => g.id === data.replacement.linkedGoalId);
          if (targetGoal) {
            const currentLinked = targetGoal.linkedTemplateIds || [];
            if (!currentLinked.includes(newTemplateId)) {
              await LifeGoalRepository.saveGoal({
                ...targetGoal,
                linkedTemplateIds: [...currentLinked, newTemplateId],
                updatedAt: Date.now(),
              });
            }
          }
        }
      } else if (data.scope === 'all_occurrences') {
        const updatedTemplate: RoutineTemplate = {
          ...replacingOccurrence.template,
          title: data.replacement.title,
          category: data.replacement.category,
          startTime: data.replacement.startTime,
          endTime: data.replacement.endTime,
          color: data.replacement.color || replacingOccurrence.template.color,
          updatedAt: Date.now(),
        };
        await RoutineRepository.saveTemplate(updatedTemplate);

        if (data.replacement.linkedGoalId) {
          const targetGoal = lifeGoals.find((g) => g.id === data.replacement.linkedGoalId);
          if (targetGoal) {
            const currentLinked = targetGoal.linkedTemplateIds || [];
            if (!currentLinked.includes(updatedTemplate.id)) {
              await LifeGoalRepository.saveGoal({
                ...targetGoal,
                linkedTemplateIds: [...currentLinked, updatedTemplate.id],
                updatedAt: Date.now(),
              });
            }
          }
        }
      }

      // Always create the occurrence override for today's specific date to lock in metadata & partial logging
      const overrideId = `override_${replacingOccurrence.templateId}_${selectedDate}`;
      const override: OccurrenceOverride = {
        id: overrideId,
        userId,
        templateId: replacingOccurrence.templateId,
        date: selectedDate,
        isCancelled: false,
        isPostponed: false,
        isReplaced: true,
        replacementActivity: replacementDetails,
        originalActivitySnapshot: {
          title: replacingOccurrence.title,
          category: replacingOccurrence.category,
          startTime: replacingOccurrence.startTime,
          endTime: replacingOccurrence.endTime,
          durationMinutes: replacingOccurrence.durationMinutes,
        },
        partialDurationMinutes: data.partialDurationMinutes,
        rescheduledTo: rescheduleDetails,
        updatedAt: Date.now(),
      };

      await OverrideRepository.saveOverride(override);

      // Handle logs and partial goal credits
      if (data.partialDurationMinutes && data.partialDurationMinutes > 0) {
        await LogRepository.updateStatus(
          userId,
          selectedDate,
          replacingOccurrence.templateId,
          'partial',
          {
            actualDurationMinutes: data.partialDurationMinutes,
            completionNotes: data.replacement.reason
              ? `Replaced after partial work (${data.partialDurationMinutes}m): ${data.replacement.reason}`
              : `Replaced after partial work (${data.partialDurationMinutes}m)`,
          }
        );

        const linkedGoal = lifeGoals.find((g) => g.linkedTemplateIds?.includes(replacingOccurrence.templateId));
        if (linkedGoal) {
          await LifeGoalRepository.recordActivityForGoal(
            userId,
            linkedGoal.id,
            {
              date: selectedDate,
              activityTitle: replacingOccurrence.title,
              durationMinutes: data.partialDurationMinutes,
              notes: `Partial work before replacement with "${data.replacement.title}"`,
              templateId: replacingOccurrence.templateId,
              incrementProgress: Boolean(linkedGoal.autoTrackFromActivities),
            }
          );
        }
      } else {
        await LogRepository.updateStatus(
          userId,
          selectedDate,
          replacingOccurrence.templateId,
          'replaced',
          {
            completionNotes: data.replacement.reason
              ? `Replaced with "${data.replacement.title}": ${data.replacement.reason}`
              : `Replaced with "${data.replacement.title}"`,
          }
        );
      }

      // Reconcile notifications
      const curTemplates = RoutineRepository.getLocalTemplates(userId);
      const curOverrides = OverrideRepository.getLocalOverrides(userId);
      const curLogs = LogRepository.getLocalLogs(userId);
      const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
      NotificationManager.reconcileNotifications(
        userId,
        curTemplates,
        curOverrides,
        prefs,
        curLogs,
        dayTemplates,
        weeklyPlanner || undefined
      ).catch((e) => console.warn('Notification reconciliation error:', e));

      showToast(`Replaced "${replacingOccurrence.title}" with "${data.replacement.title}" ✓`);
      setReplaceDialogOpen(false);
      setReplacingOccurrence(null);
      await loadData();
    } catch (err) {
      console.error('Failed to replace block:', err);
      showToast('Error replacing block. Please try again.');
    }
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
                  { id: 'goals', label: 'Goals', icon: Target },
                  { id: 'templates', label: 'Templates', icon: Layers },
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

                {/* GPS Speedometer Quick Launcher */}
                <button
                  type="button"
                  id="btn-header-speedometer"
                  onClick={() => setSpeedometerOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white transition cursor-pointer min-h-[36px] shadow-sm shadow-cyan-950/20 active:scale-95"
                  title="Open GPS Speedometer & Trip Tracker"
                >
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Speed</span>
                </button>

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
                onResumeRoutine={handleResumeCompleteRoutine}
                onAddComment={handleAddComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                onOpenSpeedometer={() => setSpeedometerOpen(true)}
                onOpenReplace={handleOpenReplace}
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
                onOpenSkipModal={() => setSkipRoutineModalOpen(true)}
                onResumeCompleteRoutine={handleResumeCompleteRoutine}
                isWeekend={dayInfo.isWeekend}
                isHoliday={dayInfo.isHoliday}
                holidayName={dayInfo.holidayName}
                onAddComment={handleAddComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                lifeGoals={lifeGoals}
                onSwitchToGoals={() => setActiveTab('goals')}
                activeDayTemplate={activeDayTemplate}
                allDayTemplates={dayTemplates}
                onQuickSwitchTemplate={handleQuickSwitchTodayTemplate}
                onNavigateToTemplates={() => setActiveTab('templates')}
                dailyGoals={goals}
                goalProgress={goalProgress}
                onRecordGoalProgress={handleRecordGoalProgress}
                onUndoLastGoalProgress={handleUndoLastGoalProgress}
                onOpenReplace={handleOpenReplace}
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

          {activeTab === 'goals' && (
            <GoalsDashboard
              userId={userId}
              goals={lifeGoals}
              templates={templates}
              onSaveGoal={handleSaveLifeGoal}
              onDeleteGoal={handleDeleteLifeGoal}
              onLogProgress={handleLogGoalProgress}
              onToggleMilestone={handleToggleGoalMilestone}
              onAddMilestone={handleAddGoalMilestone}
              onDeleteMilestone={handleDeleteGoalMilestone}
              onAddChecklistItem={handleAddGoalChecklistItem}
              onToggleChecklistItem={handleToggleGoalChecklistItem}
              onDeleteChecklistItem={handleDeleteGoalChecklistItem}
              onAddComment={handleAddGoalComment}
              onUpdateComment={handleUpdateGoalComment}
              onDeleteComment={handleDeleteGoalComment}
              onRecordActivity={handleRecordGoalActivity}
              onSaveTrackedItem={handleSaveGoalTrackedItem}
              onDeleteTrackedItem={handleDeleteGoalTrackedItem}
              onUpdateItemProgress={handleUpdateItemProgress}
              onLogItemProgress={handleLogItemProgress}
              onUndoProgressLog={handleUndoGoalProgressLog}
              onTogglePhaseStatus={handleTogglePhaseStatus}
              onAddPhaseTask={handleAddPhaseTask}
              onTogglePhaseTask={handleTogglePhaseTask}
              onDeletePhaseTask={handleDeletePhaseTask}
              onAddNamedList={handleAddNamedList}
              onAddListItem={handleAddListItem}
              onToggleListItem={handleToggleListItem}
              onDeleteListItem={handleDeleteListItem}
              onAddExperience={handleAddExperience}
              onDeleteExperience={handleDeleteExperience}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesDashboard
              userId={userId}
              templates={dayTemplates}
              planner={weeklyPlanner || DayTemplateRepository.getLocalWeeklyPlanner(userId)}
              onSaveTemplate={handleSaveDayTemplate}
              onDeleteTemplate={handleDeleteDayTemplate}
              onDuplicateTemplate={handleDuplicateDayTemplate}
              onSavePlanner={handleSaveWeeklyPlanner}
              onRefresh={loadData}
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
              dayTemplates={dayTemplates}
              weeklyPlanner={weeklyPlanner || undefined}
              overrides={overrides}
              logs={logs}
              goals={goals}
              goalProgress={goalProgress}
              onSaveGoal={handleSaveGoal}
              onDeleteGoal={handleDeleteGoal}
              onRecordGoalProgress={handleRecordGoalProgress}
              onDeleteGoalProgress={handleDeleteGoalProgress}
              onUndoLastGoalProgress={handleUndoLastGoalProgress}
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

          <SkipCompleteRoutineModal
            isOpen={skipRoutineModalOpen}
            date={selectedDate}
            occurrences={occurrences}
            isWeekend={dayInfo.isWeekend}
            isHoliday={dayInfo.isHoliday}
            holidayName={dayInfo.holidayName}
            onConfirmSkip={handleSkipCompleteRoutine}
            onClose={() => setSkipRoutineModalOpen(false)}
          />

          <ReplaceBlockDialog
            isOpen={replaceDialogOpen}
            occurrence={replacingOccurrence}
            selectedDate={selectedDate}
            allOccurrences={occurrences}
            routineTemplates={templates}
            dayTemplates={dayTemplates}
            lifeGoals={lifeGoals}
            onConfirmReplacement={handleConfirmReplacement}
            onClose={() => {
              setReplaceDialogOpen(false);
              setReplacingOccurrence(null);
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
            onOpenSpeedometer={() => {
              setMobileDrawerOpen(false);
              setSpeedometerOpen(true);
            }}
            user={user}
            isDemoMode={isDemoMode}
            onSignOut={async () => {
              setMobileDrawerOpen(false);
              await signOut();
            }}
          />

          {/* GPS Speedometer & Trip Tracker Modal */}
          <SpeedometerModal
            isOpen={speedometerOpen}
            onClose={() => setSpeedometerOpen(false)}
            occurrences={occurrences}
            activeOccurrence={occurrences.find((o) => {
              const startM = timeToMinutes(o.startTime);
              const endM = timeToMinutes(o.endTime);
              const curM = timeToMinutes(getCurrentTimeString('Asia/Kolkata'));
              return endM >= startM ? curM >= startM && curM < endM : curM >= startM || curM < endM;
            })}
            onAddComment={handleAddComment}
          />
        </>
      )}
    </div>
  );
}
