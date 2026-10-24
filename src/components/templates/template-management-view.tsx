'use client';

import React, { useState } from 'react';
import {
  Plus,
  Upload,
  Download,
  Copy,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Sun,
  Coffee,
  Heart,
  BookOpen,
  Star,
  Zap,
} from 'lucide-react';
import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { TemplateIO } from '@/lib/templates/template-io';
import { calculateDuration, formatTime12Hour } from '@/lib/time-utils';

interface TemplateManagementViewProps {
  templates: DayRoutineTemplate[];
  planner: WeeklyPlannerConfig;
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onEditTemplate: (template: DayRoutineTemplate) => void;
  onDuplicateTemplate: (template: DayRoutineTemplate) => Promise<void> | void;
  onDeleteTemplate: (templateId: string) => Promise<void> | void;
  onOpenApplyDialog: (template: DayRoutineTemplate) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  briefcase: Briefcase,
  sun: Sun,
  calendar: Calendar,
  coffee: Coffee,
  heart: Heart,
  book: BookOpen,
  star: Star,
  zap: Zap,
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TemplateManagementView({
  templates,
  planner,
  onOpenCreate,
  onOpenImport,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onOpenApplyDialog,
}: TemplateManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.blocks.some((b) => b.title.toLowerCase().includes(q))
    );
  });

  const getAssignedDays = (templateId: string): string[] => {
    return Object.entries(planner.assignments)
      .filter(([_, id]) => id === templateId)
      .map(([day]) => DAY_NAMES[Number(day)] || day);
  };

  const handleExport = (template: DayRoutineTemplate) => {
    TemplateIO.downloadTemplateJson(template);
    showFeedback(`Exported "${template.name}" as JSON!`);
  };

  const handleDuplicate = async (template: DayRoutineTemplate) => {
    await onDuplicateTemplate(template);
    showFeedback(`Duplicated "${template.name}"!`);
  };

  const handleDelete = async (template: DayRoutineTemplate) => {
    setDeleteError(null);
    try {
      await onDeleteTemplate(template.id);
      showFeedback(`Deleted "${template.name}".`);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete template.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Action Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-blue-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Day Routine Templates</h2>
            </div>
            <p className="text-xs text-slate-400">
              Create, customize, preview, duplicate, export, and manage cohesive day routine packages.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import JSON</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates or activity blocks..."
              className="w-full bg-slate-800/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <span className="text-xs text-slate-400 font-medium shrink-0">
            {templates.length} saved {templates.length === 1 ? 'template' : 'templates'}
          </span>
        </div>

        {feedbackMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {deleteError && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-white/10">
          <Layers className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Routine Templates Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No templates match your search query.'
              : 'Create your first day routine template to customize your lifestyle schedule.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => {
            const IconComp = ICON_MAP[template.icon || 'briefcase'] || Sparkles;
            const assignedDays = getAssignedDays(template.id);
            const isAssigned = assignedDays.length > 0;
            const isDefaultFallback = planner.defaultTemplateId === template.id;
            const isExpanded = expandedTemplateId === template.id;

            const totalMinutes = template.blocks.reduce(
              (acc, b) => acc + calculateDuration(b.startTime, b.endTime),
              0
            );
            const totalHours = (totalMinutes / 60).toFixed(1);

            return (
              <div
                key={template.id}
                className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-white/20 transition-all duration-200 shadow-xl overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-white/5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg"
                        style={{ backgroundColor: template.color || '#3b82f6' }}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white truncate">{template.name}</h3>
                          {template.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              System Default
                            </span>
                          )}
                          {isDefaultFallback && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Planner Fallback
                            </span>
                          )}
                        </div>

                        {template.description && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenApplyDialog(template)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold transition-colors shrink-0"
                    >
                      Apply...
                    </button>
                  </div>

                  {/* Badges / Metrics */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {template.blocks.length} blocks • {totalHours}h
                      </span>
                    </span>

                    {isAssigned && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span>Active on: {assignedDays.join(', ')}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Blocks Timeline / Preview Section */}
                <div className="p-4 sm:p-5 flex-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-300">Routine Timeline</span>
                    <button
                      type="button"
                      onClick={() => setExpandedTemplateId(isExpanded ? null : template.id)}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
                    >
                      <span>{isExpanded ? 'Collapse' : `View All (${template.blocks.length})`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded or Compact View */}
                  {isExpanded ? (
                    <div className="max-h-64 overflow-y-auto space-y-1.5 animate-in fade-in">
                      {template.blocks.map((block) => (
                        <div
                          key={block.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-2 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: block.color || template.color }}
                            />
                            <span className="font-semibold text-white truncate max-w-[200px]">
                              {block.title}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 capitalize">
                              {block.category}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[11px] shrink-0">
                            {formatTime12Hour(block.startTime)} – {formatTime12Hour(block.endTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {template.blocks.slice(0, 3).map((block) => (
                        <div
                          key={block.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-800/50 text-slate-300"
                        >
                          <span className="truncate max-w-[200px] font-medium">{block.title}</span>
                          <span className="text-slate-500 text-[11px] shrink-0">
                            {formatTime12Hour(block.startTime)} – {formatTime12Hour(block.endTime)}
                          </span>
                        </div>
                      ))}
                      {template.blocks.length > 3 && (
                        <p className="text-[11px] text-slate-500 text-center pt-1">
                          +{template.blocks.length - 3} more activity blocks
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 border-t border-white/5 bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditTemplate(template)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                      title="Edit template & blocks"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(template)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                      title="Duplicate template"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(template)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Export as JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(template)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
