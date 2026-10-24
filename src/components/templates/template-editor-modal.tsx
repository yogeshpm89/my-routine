'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Briefcase,
  Sun,
  Calendar,
  Coffee,
  Heart,
  BookOpen,
  Star,
  Zap,
  Edit2,
  Lock,
} from 'lucide-react';
import { DayRoutineTemplate } from '@/types/routine-templates';
import { RoutineTemplate, ActivityCategory } from '@/types/routine';
import { calculateDuration, formatTime12Hour } from '@/lib/time-utils';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DayRoutineTemplate | null;
  userId: string;
  onSave: (template: DayRoutineTemplate) => Promise<void> | void;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#64748b', // Slate
];

const PRESET_ICONS = [
  { id: 'briefcase', label: 'Work', icon: Briefcase },
  { id: 'sun', label: 'Day / Leisure', icon: Sun },
  { id: 'calendar', label: 'Schedule', icon: Calendar },
  { id: 'coffee', label: 'Morning', icon: Coffee },
  { id: 'heart', label: 'Wellness', icon: Heart },
  { id: 'book', label: 'Learning', icon: BookOpen },
  { id: 'star', label: 'Special', icon: Star },
  { id: 'zap', label: 'Focus', icon: Zap },
];

const CATEGORIES: ActivityCategory[] = [
  'work',
  'mindfulness',
  'learning',
  'family',
  'health',
  'business',
  'fitness',
  'rest',
  'personal',
  'buffer',
  'other',
];

export function TemplateEditorModal({
  isOpen,
  onClose,
  template,
  userId,
  onSave,
}: TemplateEditorModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('briefcase');
  const [blocks, setBlocks] = useState<RoutineTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Block editing state
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockCategory, setBlockCategory] = useState<ActivityCategory>('personal');
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('10:00');
  const [blockColor, setBlockColor] = useState('#3b82f6');
  const [blockNotes, setBlockNotes] = useState('');
  const [blockIsFixed, setBlockIsFixed] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setColor(template.color || '#3b82f6');
      setIcon(template.icon || 'briefcase');
      setBlocks([...template.blocks]);
    } else {
      setName('');
      setDescription('');
      setColor('#3b82f6');
      setIcon('briefcase');
      setBlocks([]);
    }
    setError(null);
    setShowAddBlock(false);
    setEditingBlockId(null);
  }, [template, isOpen]);

  if (!isOpen) return null;

  const handleSaveBlock = () => {
    if (!blockTitle.trim()) {
      setError('Activity title is required');
      return;
    }

    const now = Date.now();
    if (editingBlockId) {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === editingBlockId
            ? {
                ...b,
                title: blockTitle.trim(),
                category: blockCategory,
                startTime: blockStart,
                endTime: blockEnd,
                color: blockColor,
                notes: blockNotes.trim(),
                isFixed: blockIsFixed,
                updatedAt: now,
              }
            : b
        )
      );
      setEditingBlockId(null);
    } else {
      const newBlock: RoutineTemplate = {
        id: `block_${now}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        title: blockTitle.trim(),
        category: blockCategory,
        startTime: blockStart,
        endTime: blockEnd,
        isFixed: blockIsFixed,
        recurrence: {
          frequency: 'daily',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startDate: '2026-01-01',
          exceptions: [],
        },
        notifications: [
          { id: `notif_${now}`, type: 'start', offsetMinutes: 0, enabled: true },
        ],
        notes: blockNotes.trim(),
        color: blockColor,
        timezone: 'Asia/Kolkata',
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      setBlocks((prev) => [...prev, newBlock]);
    }

    // Reset block form
    setBlockTitle('');
    setBlockNotes('');
    setShowAddBlock(false);
    setError(null);
  };

  const handleStartEditBlock = (block: RoutineTemplate) => {
    setEditingBlockId(block.id);
    setBlockTitle(block.title);
    setBlockCategory(block.category);
    setBlockStart(block.startTime);
    setBlockEnd(block.endTime);
    setBlockColor(block.color);
    setBlockNotes(block.notes || '');
    setBlockIsFixed(block.isFixed || false);
    setShowAddBlock(true);
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a template name.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = Date.now();
      // Sort blocks chronologically
      const sortedBlocks = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

      const updatedTemplate: DayRoutineTemplate = {
        id: template?.id || `tpl_${now}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        blocks: sortedBlocks,
        isDefault: template?.isDefault || false,
        schemaVersion: 1,
        createdAt: template?.createdAt || now,
        updatedAt: now,
      };

      await onSave(updatedTemplate);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = blocks.reduce(
    (acc, b) => acc + calculateDuration(b.startTime, b.endTime),
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: color }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {template ? 'Edit Day Routine Template' : 'Create New Day Template'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure your routine schedule, theme, and constituent activity blocks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekday Deep Work, Weekend Leisure, Holiday Routine"
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Deep focus blocks, evening fitness, and family dinner"
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Color Palette */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Theme Color
              </label>
              <div className="flex flex-wrap gap-2.5 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                      color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Routine Blocks Section */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Activity Blocks</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-normal">
                    {blocks.length} blocks • {totalHours}h
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Scheduled activities within this day routine</p>
              </div>

              {!showAddBlock && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlockId(null);
                    setBlockTitle('');
                    setBlockNotes('');
                    setShowAddBlock(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Block</span>
                </button>
              )}
            </div>

            {/* Add / Edit Block Subform */}
            {showAddBlock && (
              <div className="p-4 bg-slate-800/90 border border-blue-500/30 rounded-xl space-y-3 mb-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">
                    {editingBlockId ? 'Edit Activity Block' : 'New Activity Block'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBlock(false);
                      setEditingBlockId(null);
                    }}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Title *</label>
                    <input
                      type="text"
                      value={blockTitle}
                      onChange={(e) => setBlockTitle(e.target.value)}
                      placeholder="e.g. Deep Work, Cycling, Lunch"
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
                    <select
                      value={blockCategory}
                      onChange={(e) => setBlockCategory(e.target.value as ActivityCategory)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Start Time (HH:mm)</label>
                    <input
                      type="time"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">End Time (HH:mm)</label>
                    <input
                      type="time"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Notes / Instructions</label>
                  <input
                    type="text"
                    value={blockNotes}
                    onChange={(e) => setBlockNotes(e.target.value)}
                    placeholder="Optional tips, links, or notes"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={blockIsFixed}
                      onChange={(e) => setBlockIsFixed(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Fixed time (Protected from shifts)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveBlock}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    {editingBlockId ? 'Update Block' : 'Add Block'}
                  </button>
                </div>
              </div>
            )}

            {/* Blocks List */}
            {blocks.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-xl bg-slate-800/30">
                <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No activity blocks added yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click "+ Add Block" above to add activities to this routine template.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...blocks]
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((block) => {
                    const duration = calculateDuration(block.startTime, block.endTime);
                    return (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-2.5 h-9 rounded-full shrink-0"
                            style={{ backgroundColor: block.color || color }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white truncate">{block.title}</span>
                              {block.isFixed && (
                                <span title="Fixed schedule">
                                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 capitalize">
                                {block.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>
                                {formatTime12Hour(block.startTime)} – {formatTime12Hour(block.endTime)}
                              </span>
                              <span>•</span>
                              <span>{duration}m</span>
                              {block.notes && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[180px] text-slate-500">{block.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditBlock(block)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                            title="Edit block"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Saving Template...' : template ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
