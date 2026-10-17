'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, SyncState } from '@/lib/sync/sync-engine';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { BackupService } from '@/lib/sync/backup-service';
import { NotificationSettingsPanel } from '@/components/notifications/notification-settings-panel';
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
} from 'lucide-react';

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
