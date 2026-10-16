'use client';

import React from 'react';
import { SyncConflict } from '@/lib/sync/sync-engine';
import { AlertTriangle, ArrowRight, Check, X, ShieldAlert } from 'lucide-react';

interface ConflictResolverModalProps {
  conflicts: SyncConflict[];
  onResolve: (conflictId: string, resolution: 'keep_local' | 'accept_remote') => void;
  onDismiss: () => void;
}

export function ConflictResolverModal({
  conflicts,
  onResolve,
  onDismiss,
}: ConflictResolverModalProps) {
  if (!conflicts || conflicts.length === 0) return null;

  const currentConflict = conflicts[0];
  const { mutation, localData, remoteData } = currentConflict;

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'Unknown';
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl space-y-6">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Concurrent Sync Conflict Detected
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                A remote change on another device conflicts with your pending offline edits.
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/20 text-xs text-amber-300">
          Target entity:{' '}
          <strong className="text-white">
            {localData?.title || remoteData?.title || mutation.docId}
          </strong>{' '}
          ({mutation.collection})
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Local Pending Version */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-blue-500/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Your Local Version
              </span>
              <span className="text-[11px] text-slate-400">
                Edited: {formatTimestamp(mutation.timestamp)}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-300">
              <div>
                Title: <strong className="text-white">{localData?.title || '—'}</strong>
              </div>
              <div>
                Time Window:{' '}
                <strong className="text-white">
                  {localData?.startTime || '—'} – {localData?.endTime || '—'}
                </strong>
              </div>
              {localData?.notes && (
                <div className="text-slate-400 italic">Notes: &ldquo;{localData.notes}&rdquo;</div>
              )}
            </div>

            <button
              onClick={() => onResolve(currentConflict.id, 'keep_local')}
              className="w-full mt-3 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              Keep My Local Version
            </button>
          </div>

          {/* Remote Cloud Version */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Cloud Version
              </span>
              <span className="text-[11px] text-slate-400">
                Saved: {formatTimestamp(remoteData?.updatedAt)}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-300">
              <div>
                Title: <strong className="text-white">{remoteData?.title || '—'}</strong>
              </div>
              <div>
                Time Window:{' '}
                <strong className="text-white">
                  {remoteData?.startTime || '—'} – {remoteData?.endTime || '—'}
                </strong>
              </div>
              {remoteData?.notes && (
                <div className="text-slate-400 italic">Notes: &ldquo;{remoteData.notes}&rdquo;</div>
              )}
            </div>

            <button
              onClick={() => onResolve(currentConflict.id, 'accept_remote')}
              className="w-full mt-3 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
            >
              Accept Cloud Version
            </button>
          </div>
        </div>

        {conflicts.length > 1 && (
          <div className="text-center text-xs text-slate-400">
            {conflicts.length - 1} more conflict{conflicts.length > 2 ? 's' : ''} to resolve.
          </div>
        )}
      </div>
    </div>
  );
}
