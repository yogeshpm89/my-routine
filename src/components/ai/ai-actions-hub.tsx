'use client';

import React, { useState, useEffect } from 'react';
import { AiActionConfig, AiExecution, AiResult } from '@/types/ai';
import { AiActionRepository } from '@/lib/repositories/ai-action-repository';
import { AiExecutionRepository } from '@/lib/repositories/ai-execution-repository';
import { AiActionModal } from './ai-action-modal';
import { AiExecutionDialog } from './ai-execution-dialog';
import {
  Sparkles,
  Plus,
  Play,
  Edit2,
  History,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AiActionsHubProps {
  userId: string;
}

export function AiActionsHub({ userId }: AiActionsHubProps) {
  const [actions, setActions] = useState<AiActionConfig[]>([]);
  const [historyItems, setHistoryItems] = useState<{ execution: AiExecution; result?: AiResult }[]>([]);
  const [selectedActionForExecution, setSelectedActionForExecution] = useState<AiActionConfig | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<AiActionConfig | null>(null);

  useEffect(() => {
    // 1. Initial load
    setActions(AiActionRepository.getLocalActions(userId));
    AiActionRepository.getActions(userId).then(setActions);

    AiExecutionRepository.getAllHistory(userId).then(setHistoryItems);

    // 2. Real-time subscriptions
    const unsubActions = AiActionRepository.subscribeAiActions(userId, setActions);
    const unsubExecutions = AiExecutionRepository.subscribeAiExecutions(userId, () => {
      AiExecutionRepository.getAllHistory(userId).then(setHistoryItems);
    });

    return () => {
      unsubActions();
      unsubExecutions();
    };
  }, [userId]);

  const handleSaveAction = async (action: AiActionConfig) => {
    await AiActionRepository.saveAction(action);
    setActions(AiActionRepository.getLocalActions(userId));
  };

  const handleDeleteAction = async (actionId: string) => {
    await AiActionRepository.deleteAction(userId, actionId);
    setActions(AiActionRepository.getLocalActions(userId));
  };

  const handleOpenExecution = (action: AiActionConfig) => {
    setSelectedActionForExecution(action);
  };

  const handleOpenHistoryItem = (item: { execution: AiExecution; result?: AiResult }) => {
    const matchedAction = actions.find((a) => a.id === item.execution.actionId) || {
      id: item.execution.actionId,
      userId,
      name: item.execution.actionName,
      description: 'Historical Execution',
      prompt: item.execution.promptSnapshot,
      outputFormat: (item.result?.contentFormat as any) || 'markdown',
      requiresUserInput: false,
      researchEnabled: false,
      enabled: true,
      schemaVersion: 1,
      createdAt: item.execution.createdAt,
      updatedAt: item.execution.createdAt,
    };
    setSelectedActionForExecution(matchedAction);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/60 via-slate-900/90 to-purple-950/60 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              AI Routine Actions
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Execute intelligent briefings, daily motivation reflections, and guided journal insights directly on your routines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingAction(null);
            setIsEditorOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Custom Action
        </button>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => (
          <div
            key={action.id}
            className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-blue-500/30 transition flex flex-col justify-between space-y-4 backdrop-blur-sm group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition">
                    {action.name}
                  </h3>
                  {action.researchEnabled && (
                    <span
                      title="Web research grounding enabled"
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >
                      <Globe className="w-2.5 h-2.5" /> Research
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingAction(action);
                    setIsEditorOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Edit prompt instructions"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {action.description || action.prompt}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="capitalize">{action.outputFormat}</span>
                {action.requiresUserInput && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400">Input Required</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleOpenExecution(action)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-md shadow-blue-500/20"
              >
                <Play className="w-3 h-3 fill-current" /> Execute
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Execution History Section */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Execution History</h3>
          </div>
          <span className="text-xs text-slate-400">
            {historyItems.length} total executions
          </span>
        </div>

        {historyItems.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-950/30 text-center text-xs text-slate-400">
            No AI actions executed yet. Click <strong>Execute</strong> on any action above to generate your first briefing.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {historyItems.map((item) => (
              <div
                key={item.execution.id}
                onClick={() => handleOpenHistoryItem(item)}
                className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 hover:border-blue-500/30 transition text-xs space-y-2 cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white block truncate">
                      {item.execution.actionName}
                    </strong>
                    {item.execution.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                  </div>
                  {item.execution.routineTitle && (
                    <span className="text-[11px] text-slate-400 block truncate">
                      Routine: {item.execution.routineTitle}
                    </span>
                  )}
                  {item.result?.content && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {item.result.content.replace(/[#*`_-]/g, '')}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                  <span>
                    {new Date(item.execution.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-blue-400 font-medium inline-flex items-center gap-0.5">
                    View <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <AiActionModal
        isOpen={isEditorOpen}
        initialAction={editingAction}
        userId={userId}
        onSave={handleSaveAction}
        onDelete={handleDeleteAction}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingAction(null);
        }}
      />

      {/* Execution Dialog */}
      <AiExecutionDialog
        isOpen={Boolean(selectedActionForExecution)}
        action={selectedActionForExecution}
        userId={userId}
        onClose={() => setSelectedActionForExecution(null)}
        onEditAction={(act) => {
          setSelectedActionForExecution(null);
          setEditingAction(act);
          setIsEditorOpen(true);
        }}
      />
    </div>
  );
}
