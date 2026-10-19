'use client';

import React, { useState } from 'react';
import { AppUpdateManifest } from '@/types/updates';
import { UpdateManager } from '@/lib/updates/update-manager';
import {
  Download,
  Sparkles,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  HardDrive,
  ExternalLink,
} from 'lucide-react';

interface InAppUpdateModalProps {
  isOpen: boolean;
  manifest: AppUpdateManifest | null;
  currentVersion: string;
  isCritical?: boolean;
  onClose: () => void;
  onDismissUpdate?: (version: string) => void;
}

export function InAppUpdateModal({
  isOpen,
  manifest,
  currentVersion,
  isCritical = false,
  onClose,
  onDismissUpdate,
}: InAppUpdateModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !manifest) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await UpdateManager.downloadAndInstall(manifest.apkUrl);
    } catch (err) {
      console.error('Download update error:', err);
    } finally {
      setTimeout(() => setIsDownloading(false), 3000);
    }
  };

  const handleRemindLater = () => {
    if (onDismissUpdate) {
      onDismissUpdate(manifest.version);
    } else {
      UpdateManager.dismissVersion(manifest.version);
    }
    onClose();
  };

  const formattedSize = manifest.fileSizeBytes
    ? `${(manifest.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : '~5.1 MB';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 shadow-2xl p-5 sm:p-6 text-white overflow-hidden space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow decoration */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                isCritical
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}
            >
              {isCritical ? <AlertTriangle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isCritical
                      ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                      : 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                  }`}
                >
                  {isCritical ? 'Mandatory Update' : 'New Version Available'}
                </span>
              </div>
              <h2 id="update-modal-title" className="text-lg font-bold text-white mt-0.5">
                {manifest.title || `Update v${manifest.version}`}
              </h2>
            </div>
          </div>

          {!isCritical && (
            <button
              type="button"
              onClick={handleRemindLater}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Version info pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Current:</span>
            <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
              v{currentVersion}
            </span>
            <span className="text-slate-500">→</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
              v{manifest.version}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {manifest.releaseDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                {manifest.releaseDate}
              </span>
            )}
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-500" />
              {formattedSize}
            </span>
          </div>
        </div>

        {/* Critical Notice */}
        {isCritical && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 relative z-10">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This update includes critical database schema updates and security improvements. Please
              update to continue managing your routines.
            </p>
          </div>
        )}

        {/* Changelog section */}
        <div className="space-y-2 relative z-10">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            What's New in this Release:
          </span>
          <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-900/60 border border-white/5">
            {manifest.changelog && manifest.changelog.length > 0 ? (
              manifest.changelog.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">
                Performance optimizations, bug fixes, and reliability improvements.
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 relative z-10">
          <button
            type="button"
            id="btn-download-update"
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition active:scale-[0.98] cursor-pointer min-h-[44px]"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Downloading APK...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download & Install APK</span>
              </>
            )}
          </button>

          {!isCritical && (
            <button
              type="button"
              id="btn-dismiss-update"
              onClick={handleRemindLater}
              className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition cursor-pointer min-h-[44px]"
            >
              Remind Me Later
            </button>
          )}
        </div>

        <p className="text-[11px] text-center text-slate-500 relative z-10">
          Downloaded APK can be installed directly on Android with 1 tap.
        </p>
      </div>
    </div>
  );
}
