'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
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
} from 'lucide-react';

export default function RoutineApp() {
  const { user, isDemoMode } = useAuth();
  const userId = user?.uid || 'local-default-user';

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

  // Load routine data
  const loadData = useCallback(async () => {
    if (!userId) return;
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
  }, [userId, selectedDate]);

  useEffect(() => {
    loadData();
    const unsubConflicts = SyncEngine.subscribeConflicts(setSyncConflicts);
    const unsubRealtime = SyncEngine.startRealtimeListener(userId, () => {
      loadData();
    });
    return () => {
      unsubConflicts();
      unsubRealtime();
    };
  }, [loadData, userId]);

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
    NotificationManager.initialize(userId);
    if (templates.length > 0) {
      const prefs = NotificationPreferencesRepository.getLocalPreferences(userId);
      NotificationManager.reconcileNotifications(userId, templates, overrides, prefs);
    }
  }, [userId, templates, overrides]);

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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
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
              title={isDemoMode ? 'Running in offline guest mode' : 'Connected to Cloud Firestore'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-white/10"
            >
              {isDemoMode ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 text-[11px] hidden sm:inline">Offline Mode</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px] hidden sm:inline">Cloud Synced</span>
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedDate(getTodayDateString('Asia/Kolkata'))}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition"
            >
              Today
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
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

      {/* Modals & Dialogs */}
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
    </div>
  );
}
