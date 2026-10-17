'use client';

import React, { useState, useEffect } from 'react';
import {
  AiActionConfig,
  AiOutputFormat,
} from '@/types/ai';
import { STARTER_AI_ACTIONS } from '@/lib/ai/starter-templates';
import {
  Sparkles,
  X,
  Save,
  Trash2,
  Copy,
  Globe,
  Sliders,
  HelpCircle,
} from 'lucide-react';

interface AiActionModalProps {
  isOpen: boolean;
  initialAction: AiActionConfig | null;
  userId: string;
  onSave: (action: AiActionConfig) => void;
  onDelete?: (actionId: string) => void;
  onClose: () => void;
}

export function AiActionModal({
  isOpen,
  initialAction,
  userId,
  onSave,
  onDelete,
  onClose,
}: AiActionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [outputFormat, setOutputFormat] = useState<AiOutputFormat>('markdown');
  const [requiresUserInput, setRequiresUserInput] = useState(false);
  const [userInputPlaceholder, setUserInputPlaceholder] = useState('');
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialAction) {
      setName(initialAction.name);
      setDescription(initialAction.description || '');
      setPrompt(initialAction.prompt);
      setOutputFormat(initialAction.outputFormat);
      setRequiresUserInput(initialAction.requiresUserInput);
      setUserInputPlaceholder(initialAction.userInputPlaceholder || '');
      setResearchEnabled(initialAction.researchEnabled);
      setEnabled(initialAction.enabled);
      setRoutineId(initialAction.routineId || null);
    } else {
      // Defaults for new action
      setName('');
      setDescription('');
      setPrompt('');
      setOutputFormat('markdown');
      setRequiresUserInput(false);
      setUserInputPlaceholder('');
      setResearchEnabled(false);
      setEnabled(true);
      setRoutineId(null);
    }
    setError(null);
  }, [isOpen, initialAction]);

  if (!isOpen) return null;

  const handleApplyTemplate = (template: typeof STARTER_AI_ACTIONS[0]) => {
    setName(template.name);
    setDescription(template.description);
    setPrompt(template.prompt);
    setOutputFormat(template.outputFormat);
    setRequiresUserInput(template.requiresUserInput);
    setUserInputPlaceholder(template.userInputPlaceholder || '');
    setResearchEnabled(template.researchEnabled);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please provide an action name.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please provide prompt instructions.');
      return;
    }

    const now = Date.now();
    const actionId = initialAction?.id || `action_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const savedConfig: AiActionConfig = {
      id: actionId,
      userId,
      routineId,
      name: name.trim(),
      description: description.trim(),
      prompt: prompt.trim(),
      outputFormat,
      requiresUserInput,
      userInputPlaceholder: userInputPlaceholder.trim() || undefined,
      researchEnabled,
      enabled,
      schemaVersion: 1,
      createdAt: initialAction?.createdAt || now,
      updatedAt: now,
    };

    onSave(savedConfig);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-auto rounded-3xl bg-slate-900 border border-white/10 p-5 sm:p-7 shadow-2xl shadow-blue-500/10 text-slate-100 z-10 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {initialAction ? 'Edit AI Routine Action' : 'Configure AI Routine Action'}
              </h3>
              <p className="text-xs text-slate-400">
                Define the model prompt instructions, format, and optional search grounding.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Starter Templates Dropdown / Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span>Apply Starter Template</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STARTER_AI_ACTIONS.map((template, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(template)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-white/5 transition cursor-pointer hover:border-blue-500/30"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white block">Action Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning News Splash, Daily Motivation"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this action generates"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white block">
                Prompt Instructions *
              </label>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>Variables: &#123;date&#125;, &#123;routineTitle&#125;, &#123;userInput&#125;</span>
              </span>
            </div>
            <textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter instructions for the AI model..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition font-mono leading-relaxed"
            />
          </div>

          {/* Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Output Format */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
              <label className="text-xs font-semibold text-white block">Output Format</label>
              <div className="flex gap-1.5">
                {[
                  { id: 'markdown', label: 'Markdown' },
                  { id: 'sections', label: 'Sections' },
                  { id: 'checklist', label: 'Checklist' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setOutputFormat(fmt.id as AiOutputFormat)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition cursor-pointer ${
                      outputFormat === fmt.id
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Research Mode */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" /> Web Research
                </label>
                <p className="text-[11px] text-slate-400">Search grounding with citations</p>
              </div>
              <input
                type="checkbox"
                checked={researchEnabled}
                onChange={(e) => setResearchEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>
          </div>

          {/* User Input Required Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-white block">
                  Require User Input at Execution Time
                </label>
                <p className="text-[11px] text-slate-400">
                  Prompt user for specific thoughts, topic, or journal notes before running
                </p>
              </div>
              <input
                type="checkbox"
                checked={requiresUserInput}
                onChange={(e) => setRequiresUserInput(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>

            {requiresUserInput && (
              <input
                type="text"
                value={userInputPlaceholder}
                onChange={(e) => setUserInputPlaceholder(e.target.value)}
                placeholder="Custom input placeholder prompt..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          {initialAction && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm('Delete this AI action? Historical execution results will remain preserved.')) {
                  onDelete(initialAction.id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-medium border border-rose-500/20 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
