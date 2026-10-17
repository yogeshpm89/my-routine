'use client';

import React, { useState, useEffect } from 'react';
import {
  NotificationManager,
} from '@/lib/notifications/notification-manager';
import {
  NotificationPreferencesRepository,
  getDefaultPreferences,
} from '@/lib/notifications/preferences-repository';
import {
  NotificationPreferences,
  ScheduledNotificationItem,
  NotificationDiagnostics,
} from '@/types/notifications';
import { RoutineRepository } from '@/lib/repositories/routine-repository';
import { OverrideRepository } from '@/lib/repositories/override-repository';
import { LogRepository } from '@/lib/repositories/log-repository';
import {
  Bell,
  BellRing,
  Moon,
  Volume2,
  Vibrate,
  Clock,
  Watch,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface NotificationSettingsPanelProps {
  userId: string;
}

export function NotificationSettingsPanel({ userId }: NotificationSettingsPanelProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() =>
    getDefaultPreferences(userId)
  );
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [registryItems, setRegistryItems] = useState<ScheduledNotificationItem[]>(() =>
    typeof window !== 'undefined' ? NotificationManager.getLocalRegistry(userId) : []
  );
  const [diagnostics, setDiagnostics] = useState<NotificationDiagnostics | null>(() =>
    typeof window !== 'undefined' ? NotificationManager.getDiagnostics(userId) : null
  );
  const [isReconciling, setIsReconciling] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    NotificationPreferencesRepository.getPreferences(userId).then((p) => {
      if (isMounted) setPrefs(p);
    });
    NotificationManager.checkPermissions().then((granted) => {
      if (isMounted) setPermissionGranted(granted);
    });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleToggleQuietHours = () => {
    const updated = { ...prefs, quietHoursEnabled: !prefs.quietHoursEnabled };
    setPrefs(updated);
    NotificationPreferencesRepository.savePreferences(updated);
    setSaveMessage('Quiet hours preference updated.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleUpdateQuietTime = (field: 'quietHoursStart' | 'quietHoursEnd', val: string) => {
    const updated = { ...prefs, [field]: val };
    setPrefs(updated);
    NotificationPreferencesRepository.savePreferences(updated);
  };

  const handleToggleSound = () => {
    const updated = { ...prefs, soundEnabled: !prefs.soundEnabled };
    setPrefs(updated);
    NotificationPreferencesRepository.savePreferences(updated);
  };

  const handleToggleVibrate = () => {
    const updated = { ...prefs, vibrationEnabled: !prefs.vibrationEnabled };
    setPrefs(updated);
    NotificationPreferencesRepository.savePreferences(updated);
  };

  const handleSnoozeChange = (minutes: number) => {
    const updated = { ...prefs, snoozeDurationMinutes: minutes };
    setPrefs(updated);
    NotificationPreferencesRepository.savePreferences(updated);
  };

  const handleRequestPermission = async () => {
    const granted = await NotificationManager.requestPermissions();
    setPermissionGranted(granted);
    if (granted) {
      setSaveMessage('Notification permission granted.');
    } else {
      setSaveMessage('Notification permission was not granted.');
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSendTestNotification = async () => {
    const sent = await NotificationManager.sendTestNotification();
    if (sent) {
      setSaveMessage('Test alert sent! Check your phone notification shade and Amazfit watch.');
    } else {
      setSaveMessage('Could not dispatch notification. Please grant permission.');
    }
    setTimeout(() => {
      setSaveMessage(null);
    }, 5000);
  };

  const handleRefreshScheduleNow = async () => {
    setIsReconciling(true);
    try {
      const templates = RoutineRepository.getLocalTemplates(userId);
      const overrides = OverrideRepository.getLocalOverrides(userId);
      const logs = LogRepository.getLocalLogs(userId);
      const res = await NotificationManager.reconcileNotifications(userId, templates, overrides, prefs, logs);
      const updatedRegistry = NotificationManager.getLocalRegistry(userId);
      setRegistryItems(updatedRegistry);
      const updatedDiag = NotificationManager.getDiagnostics(userId);
      setDiagnostics(updatedDiag);
      setSaveMessage(`Schedule reconciled. ${res.scheduled} alarms queued for next 72 hours.`);
    } catch {
      setSaveMessage('Failed to refresh notification schedule.');
    } finally {
      setIsReconciling(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/40 text-blue-200 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Permission & Native Status */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Native Android & Smartwatch Alerts</h3>
              <p className="text-xs text-slate-400">
                High-priority notifications with Amazfit Zepp notification mirroring
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {permissionGranted ? (
              <span className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Notifications Allowed
              </span>
            ) : (
              <button
                onClick={handleRequestPermission}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 active:scale-95 text-white shadow-md transition cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" /> Enable Notifications
              </button>
            )}

            <button
              onClick={handleRefreshScheduleNow}
              disabled={isReconciling}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-white/10 shadow-md transition cursor-pointer disabled:opacity-50"
              title="Re-evaluate 72-hour rolling schedule immediately"
            >
              <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>Refresh Schedule</span>
            </button>

            <button
              onClick={handleSendTestNotification}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-md transition cursor-pointer"
            >
              <Bell className="w-4 h-4" /> Test Alert
            </button>
          </div>
        </div>

        {/* Live Diagnostics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Active Alarms</span>
            <div className="text-sm font-bold text-white">
              {diagnostics?.scheduledCount || registryItems.length} scheduled
            </div>
            <span className="text-[10px] text-slate-500 block">Rolling 72h window</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Last Sync</span>
            <div className="text-sm font-bold text-slate-200">
              {diagnostics?.lastReconciliationTime
                ? new Date(diagnostics.lastReconciliationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Pending'}
            </div>
            <span className="text-[10px] text-slate-500 block">AlarmManager sync</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Next Reminder</span>
            <div className="text-sm font-bold text-blue-400 truncate">
              {diagnostics?.nextScheduledTime
                ? new Date(diagnostics.nextScheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'None pending'}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              {diagnostics?.nextScheduledTitle || 'All caught up'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Exact Alarms</span>
            <div className={`text-sm font-bold ${permissionGranted ? 'text-emerald-400' : 'text-amber-400'}`}>
              {permissionGranted ? 'Supported' : 'Restricted'}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {permissionGranted ? 'Android AlarmManager' : 'Grant special access'}
            </span>
          </div>
        </div>

        {!permissionGranted && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-0.5">
              <strong className="font-semibold block text-white">Reminders May Be Delayed or Suppressed</strong>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Android 13+ requires notification permissions, and Android 12+ requires exact alarm access. Without these, reminders will not trigger at exact routine times or mirror to your Amazfit smartwatch.
              </p>
            </div>
          </div>
        )}

        {/* Quiet Hours & Haptics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quiet Hours Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Quiet Hours
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleQuietHours}
                aria-label="Toggle quiet hours"
                className="min-w-[48px] min-h-[44px] flex items-center justify-center p-2 -m-2 cursor-pointer"
              >
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    prefs.quietHoursEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                      prefs.quietHoursEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Mutes non-critical alerts during your sleep window (default 10:00 PM – 6:00 AM).
            </p>

            {prefs.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Quiet Start</label>
                  <input
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) => handleUpdateQuietTime('quietHoursStart', e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Quiet End</label>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) => handleUpdateQuietTime('quietHoursEnd', e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sound, Haptics & Snooze */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-white/5 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Alert Behavior & Snooze
            </span>

            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Play Sound
              </span>
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label="Toggle play sound"
                className="min-w-[48px] min-h-[44px] flex items-center justify-end p-2 -m-2 cursor-pointer"
              >
                <div
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                    prefs.soundEnabled ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                      prefs.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <Vibrate className="w-3.5 h-3.5 text-teal-400" /> Watch Vibration
              </span>
              <button
                type="button"
                onClick={handleToggleVibrate}
                aria-label="Toggle watch vibration"
                className="min-w-[48px] min-h-[44px] flex items-center justify-end p-2 -m-2 cursor-pointer"
              >
                <div
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                    prefs.vibrationEnabled ? 'bg-teal-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                      prefs.vibrationEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Snooze Duration
              </span>
              <div className="flex gap-1.5">
                {[5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSnoozeChange(mins)}
                    className={`min-w-[44px] min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-xl border transition active:scale-95 flex items-center justify-center ${
                      prefs.snoozeDurationMinutes === mins
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amazfit Zepp Mirroring Checklist */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-3">
        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
            <Watch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Zepp App & Amazfit Smartwatch Setup Checklist
            </h3>
            <p className="text-xs text-slate-400">
              Ensure timely notification forwarding and prevent Android battery sleeping
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
            <strong className="text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1. App Battery Optimization
            </strong>
            <p className="text-[11px] text-slate-400">
              Phone Settings → Apps → My Routine → Battery → Set to <strong>Unrestricted</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
            <strong className="text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 2. Exact Alarms Permission
            </strong>
            <p className="text-[11px] text-slate-400">
              Special App Access → Alarms & Reminders → Toggle <strong>Allowed</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
            <strong className="text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 3. Zepp App Alerts
            </strong>
            <p className="text-[11px] text-slate-400">
              Zepp App → Profile → Amazfit Device → App Alerts → Turn ON for <strong>My Routine</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
            <strong className="text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 4. Zepp Background Running
            </strong>
            <p className="text-[11px] text-slate-400">
              Lock Zepp in Android recent apps & disable aggressive battery saver on Zepp.
            </p>
          </div>
        </div>
      </div>

      {/* Scheduled 72-Hour Registry Viewer */}
      {registryItems.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">
              Device Notification Registry (Rolling 72h)
            </h3>
            <span className="text-xs text-slate-400">
              {registryItems.length} alarms scheduled
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {registryItems.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-white/5 text-xs text-slate-300"
              >
                <div>
                  <strong className="text-white block">{item.title}</strong>
                  <span className="text-[11px] text-slate-400">{item.body}</span>
                </div>
                <div className="text-right text-[11px] text-blue-400 font-medium">
                  {new Date(item.scheduledTimestamp).toLocaleTimeString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
