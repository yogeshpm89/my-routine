'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, SyncState } from '@/lib/sync/sync-engine';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { BackupService } from '@/lib/sync/backup-service';
import { NotificationSettingsPanel } from '@/components/notifications/notification-settings-panel';
import { HolidaySettingsPanel } from './holiday-settings-panel';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  Smartphone,
  CloudUpload,
  Sparkles,
} from 'lucide-react';
import { UpdateManager } from '@/lib/updates/update-manager';
import { UpdateCheckResult, AppUpdateManifest } from '@/types/updates';
import { InAppUpdateModal } from '@/components/updates/in-app-update-modal';

interface SettingsTabProps {
  userId: string;
  onDataReset: () => void;
}

export function SettingsTab({ userId, onDataReset }: SettingsTabProps) {
  const { user, isDemoMode, signOut } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Software Updates state
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [currentBuild, setCurrentBuild] = useState<string>('1');
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);
  const [lastCheckedTime, setLastCheckedTime] = useState<number | null>(null);

  useEffect(() => {
    UpdateManager.getCurrentVersionInfo().then((info) => {
      setCurrentVersion(info.version);
      setCurrentBuild(info.build || '1');
    });
    const prefs = UpdateManager.getPreferences();
    setAutoCheckUpdates(prefs.autoCheckOnLaunch ?? true);
    setLastCheckedTime(prefs.lastCheckedAt || null);
  }, []);

  const handleCheckUpdate = async (isManual: boolean = true) => {
    setIsCheckingUpdate(true);
    setStatusMessage('Checking for app updates...');
    try {
      const result = await UpdateManager.checkForUpdates(isManual);
      setUpdateResult(result);
      setLastCheckedTime(Date.now());
      if (result.isUpdateAvailable) {
        setStatusMessage(`Update available: v${result.latestVersion}!`);
        if (isManual) {
          setUpdateModalOpen(true);
        }
      } else {
        setStatusMessage(`You are using the latest version (v${result.currentVersion}).`);
      }
    } catch (err) {
      console.error('Update check failed:', err);
      setStatusMessage('Could not check for updates.');
    } finally {
      setIsCheckingUpdate(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleToggleAutoCheck = () => {
    const next = !autoCheckUpdates;
    setAutoCheckUpdates(next);
    const prefs = UpdateManager.getPreferences();
    UpdateManager.savePreferences({ ...prefs, autoCheckOnLaunch: next });
  };

  useEffect(() => {
    const unsub = SyncEngine.subscribeSync((state, count) => {
      setSyncState(state);
      setPendingCount(count);
    });
    setPendingCount(MutationQueue.getPendingCount(userId));
    return () => unsub();
  }, [userId]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setStatusMessage('Syncing pending mutations to Cloud Firestore...');
    const res = await SyncEngine.syncNow(userId);
    setIsSyncing(false);
    if (res.conflicts > 0) {
      setStatusMessage(`Sync paused: ${res.conflicts} conflict(s) require review.`);
    } else {
      setStatusMessage(`Sync complete. Applied ${res.applied} changes.`);
      onDataReset();
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handlePushAllToCloud = async () => {
    setIsSyncing(true);
    setStatusMessage('Uploading all local templates and goals to Cloud Firestore...');
    const res = await SyncEngine.pushAllToFirestore(userId);
    setIsSyncing(false);
    setStatusMessage(res.message);
    if (res.success) {
      onDataReset();
    }
    setTimeout(() => setStatusMessage(null), 6000);
  };

  const handleExportBackup = () => {
    BackupService.triggerDownloadBackup(userId);
    setStatusMessage('Routine backup JSON downloaded successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = BackupService.importBackupData(userId, content, 'replace');
        if (result.success) {
          setStatusMessage(
            `Import successful! Restored ${result.counts?.templates} routines, ${result.counts?.goals} targets.`
          );
          onDataReset();
        } else {
          setStatusMessage(result.message);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleResetToDefaults = () => {
    if (
      confirm(
        'Reset your schedule to the default 20+ routines and 9 daily targets? Custom changes will be replaced.'
      )
    ) {
      BackupService.resetToDefaultRoutine(userId);
      setStatusMessage('Schedule reset to default seeded routines.');
      onDataReset();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleClearAll = () => {
    if (
      confirm(
        'Are you sure you want to permanently clear all routines, logs, and goals from this account?'
      )
    ) {
      BackupService.deleteAllUserData(userId);
      setStatusMessage('All routine data cleared.');
      onDataReset();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {statusMessage && (
        <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/40 text-blue-200 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Cloud Sync & Offline Engine Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Firebase Cloud Synchronization</h3>
              <p className="text-xs text-slate-400">
                Bidirectional synchronization with offline mutation logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncState === 'offline' || isDemoMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                <WifiOff className="w-3.5 h-3.5" /> Offline Mode
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                <Wifi className="w-3.5 h-3.5" /> Cloud Connected
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
            <span className="text-slate-400 block font-medium">Pending Offline Mutations</span>
            <span className="text-xl font-bold text-white block">
              {pendingCount} {pendingCount === 1 ? 'change' : 'changes'}
            </span>
            <p className="text-[11px] text-slate-400">
              Stored locally in IndexedDB/LocalStorage; replayed deterministically when connected.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
            <span className="text-slate-400 block font-medium">Active Account</span>
            <span className="text-sm font-bold text-white block truncate">
              {user?.email || (isDemoMode ? 'Local Guest Profile' : user?.uid)}
            </span>
            <p className="text-[11px] text-slate-400">
              Isolated per-user Firestore security path: `/users/{'{userId}'}/*`
            </p>
          </div>
        </div>

        {isDemoMode && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Firebase Credentials Required in .env.local</span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Your app is currently running in <strong>Offline Guest Mode</strong> because <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> and/or <code>NEXT_PUBLIC_FIREBASE_APP_ID</code> in <code>.env.local</code> are still template placeholders.
              Paste your actual Web App credentials from the <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-semibold text-amber-200 hover:text-white">Firebase Console</a> to sync data to your live Firestore database.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            onClick={handlePushAllToCloud}
            disabled={isSyncing}
            title="Uploads all current local routine templates and daily goals into Cloud Firestore"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs sm:text-sm font-semibold border border-white/10 transition disabled:opacity-50"
          >
            <CloudUpload className="w-4 h-4 text-emerald-400" />
            <span>Upload All to Firestore</span>
          </button>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Reconciling Changes...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Native Notifications & Zepp Smartwatch Settings */}
      <NotificationSettingsPanel userId={userId} />

      {/* Holidays & Day Off Management */}
      <HolidaySettingsPanel userId={userId} onHolidaysChange={onDataReset} />

      {/* Mobile & Web In-App Updates Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Software Updates</h3>
                <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-white/10">
                  v{currentVersion} (Build {currentBuild})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct in-app release checks and 1-tap APK installation
              </p>
            </div>
          </div>

          {updateResult?.isUpdateAvailable && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full animate-pulse self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5" /> Update v{updateResult.latestVersion} Available
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCheckUpdates}
                onChange={handleToggleAutoCheck}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Check for updates automatically on launch</span>
            </label>
          </div>

          <div className="flex items-center gap-2.5">
            {updateResult?.isUpdateAvailable && updateResult.manifest && (
              <button
                type="button"
                id="btn-view-update"
                onClick={() => setUpdateModalOpen(true)}
                className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>View & Install Update</span>
              </button>
            )}

            <button
              type="button"
              id="btn-check-updates"
              onClick={() => handleCheckUpdate(true)}
              disabled={isCheckingUpdate}
              className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs sm:text-sm font-semibold border border-white/10 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
              <span>{isCheckingUpdate ? 'Checking Cloud...' : 'Check for Updates'}</span>
            </button>
          </div>
        </div>

        {lastCheckedTime && (
          <p className="text-[11px] text-slate-500 pt-0.5">
            Last checked:{' '}
            {new Date(lastCheckedTime).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            })}{' '}
            at{' '}
            {new Date(lastCheckedTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      <InAppUpdateModal
        isOpen={updateModalOpen}
        manifest={updateResult?.manifest || null}
        currentVersion={currentVersion}
        isCritical={updateResult?.isCritical}
        onClose={() => setUpdateModalOpen(false)}
      />

      {/* Backup, Export & Restore Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Data Export & Restoration</h3>
            <p className="text-xs text-slate-400">
              Download complete routine backups or restore from a previously exported JSON file
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs sm:text-sm font-semibold border border-white/10 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Backup (.JSON)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs sm:text-sm font-semibold border border-white/10 transition"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Restore from File</span>
          </button>
        </div>
      </div>

      {/* Routine Management & Defaults Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Reset & Maintenance</h3>
            <p className="text-xs text-slate-400">
              Restore default schedule or permanently purge local routine data
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <button
            onClick={handleResetToDefaults}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-purple-950/60 active:scale-95 text-purple-300 text-xs sm:text-sm font-semibold border border-purple-500/30 transition text-center"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Reset to Seeded Routine (20+ Blocks)</span>
          </button>

          <button
            onClick={handleClearAll}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 active:scale-95 text-rose-300 text-xs sm:text-sm font-semibold border border-rose-500/30 transition text-center"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Delete All Routine Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
