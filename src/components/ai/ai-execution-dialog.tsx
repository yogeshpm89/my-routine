'use client';

import React, { useState, useEffect } from 'react';
import {
  AiActionConfig,
  AiExecution,
  AiResult,
} from '@/types/ai';
import { AiGatewayClient } from '@/lib/ai/ai-gateway-client';
import { AiExecutionRepository } from '@/lib/repositories/ai-execution-repository';
import { MarkdownReader } from './markdown-reader';
import {
  Sparkles,
  X,
  Play,
  RotateCcw,
  History,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AiExecutionDialogProps {
  isOpen: boolean;
  action: AiActionConfig | null;
  routineTitle?: string;
  selectedDate?: string;
  userId: string;
  onClose: () => void;
  onEditAction?: (action: AiActionConfig) => void;
}

export function AiExecutionDialog({
  isOpen,
  action,
  routineTitle,
  selectedDate,
  userId,
  onClose,
  onEditAction,
}: AiExecutionDialogProps) {
  const [userInput, setUserInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<AiExecution | null>(null);
  const [currentResult, setCurrentResult] = useState<AiResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Past executions history
  const [historyItems, setHistoryItems] = useState<{ execution: AiExecution; result?: AiResult }[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Load latest execution or history on open
  useEffect(() => {
    if (!isOpen || !action) return;

    setUserInput('');
    setErrorMessage(null);
    setShowHistory(false);
    setSelectedHistoryIndex(null);

    // Fetch history for this action
    AiExecutionRepository.getHistoryForAction(userId, action.id).then((history) => {
      setHistoryItems(history);
      if (history.length > 0 && history[0].result) {
        // Default to latest result if not currently running
        setCurrentExecution(history[0].execution);
        setCurrentResult(history[0].result);
      } else {
        setCurrentExecution(null);
        setCurrentResult(null);
      }
    });
  }, [isOpen, action, userId]);

  if (!isOpen || !action) return null;

  const handleExecute = async () => {
    setErrorMessage(null);
    setIsRunning(true);
    setSelectedHistoryIndex(null);

    try {
      const res = await AiGatewayClient.executeAction({
        action,
        userId,
        userInput: userInput.trim() || undefined,
        routineTitle,
        selectedDate,
      });

      setCurrentExecution(res.execution);

      if (res.success && res.result) {
        setCurrentResult(res.result);
        // Refresh history
        const updatedHistory = await AiExecutionRepository.getHistoryForAction(userId, action.id);
        setHistoryItems(updatedHistory);
      } else {
        setErrorMessage(res.error || 'Execution failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Execution error.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectHistory = (index: number) => {
    setSelectedHistoryIndex(index);
    const item = historyItems[index];
    if (item) {
      setCurrentExecution(item.execution);
      setCurrentResult(item.result || null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl my-auto rounded-3xl bg-slate-900 border border-white/10 p-5 sm:p-7 shadow-2xl shadow-blue-500/10 text-slate-100 z-10 space-y-5 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {action.name}
                </h3>
                {action.researchEnabled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    Web Research
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {routineTitle ? (
                  <>
                    Routine: <strong className="text-slate-200">{routineTitle}</strong> •{' '}
                  </>
                ) : null}
                {action.description || 'AI-powered routine action'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onEditAction && (
              <button
                type="button"
                onClick={() => onEditAction(action)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Edit Prompt
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Input Section (if required) */}
        {action.requiresUserInput && !currentResult && (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2 shrink-0">
            <label className="text-xs font-semibold text-white block">
              Required Input for Action
            </label>
            <textarea
              rows={3}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={action.userInputPlaceholder || 'Enter your notes, topic, or journal thoughts...'}
              disabled={isRunning}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition"
            />
          </div>
        )}

        {/* Content Body */}
        <div className="grow overflow-y-auto pr-1 space-y-4">
          {/* Running State */}
          {isRunning && (
            <div className="p-8 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
              <div className="p-3.5 rounded-2xl bg-blue-600/10 text-blue-400">
                <Sparkles className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Synthesizing AI Routine Action...</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Executing prompt securely through Google Gemini gateway. Please stand by.
                </p>
              </div>
            </div>
          )}

          {/* Error Message with Retry */}
          {errorMessage && !isRunning && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Execution Failed</span>
              </div>
              <p className="text-rose-300">{errorMessage}</p>
              <button
                type="button"
                onClick={handleExecute}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md transition cursor-pointer mt-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry Execution
              </button>
            </div>
          )}

          {/* Result View */}
          {currentResult && !isRunning && (
            <div className="space-y-4">
              <MarkdownReader result={currentResult} />
            </div>
          )}

          {/* Initial Blank State (Before first execution) */}
          {!currentResult && !isRunning && !errorMessage && (
            <div className="p-8 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3 rounded-2xl bg-slate-800 text-slate-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Ready to Execute</h4>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  Click the Execute button below to trigger this AI action and generate your customized briefing.
                </p>
              </div>
            </div>
          )}

          {/* History Drawer / Past Executions */}
          {historyItems.length > 1 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <History className="w-3.5 h-3.5" />
                <span>
                  {showHistory ? 'Hide Previous Executions' : `View Previous Executions (${historyItems.length})`}
                </span>
              </button>

              {showHistory && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 max-h-40 overflow-y-auto">
                  {historyItems.map((item, idx) => (
                    <button
                      key={item.execution.id}
                      type="button"
                      onClick={() => handleSelectHistory(idx)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between cursor-pointer ${
                        selectedHistoryIndex === idx || (selectedHistoryIndex === null && idx === 0)
                          ? 'bg-blue-600/20 border-blue-500/50 text-white'
                          : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="block font-medium text-slate-200">
                          {new Date(item.execution.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.execution.status === 'completed' ? (
                            <span className="text-emerald-400">Completed</span>
                          ) : (
                            <span className="text-rose-400">Failed</span>
                          )}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            {currentExecution?.completedAt ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Last generated:{' '}
                  {new Date(currentExecution.completedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleExecute}
              disabled={isRunning || (action.requiresUserInput && !userInput.trim() && !currentResult)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition cursor-pointer disabled:opacity-50"
            >
              {currentResult ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" /> Rerun Action
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Execute Action
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
