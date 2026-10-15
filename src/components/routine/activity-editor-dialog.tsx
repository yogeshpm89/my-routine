'use client';

import React, { useState, useEffect } from 'react';
import {
  RoutineTemplate,
  ActivityCategory,
  RecurrenceFrequency,
  NotificationRule,
  ActivityOccurrence,
} from '@/types/routine';
import { calculateDuration, formatDuration } from '@/lib/time-utils';
import { CATEGORY_CONFIG } from './activity-badge';
import { X, Lock, Bell, Plus, Trash2, Calendar, Clock, Palette } from 'lucide-react';

interface ActivityEditorDialogProps {
  isOpen: boolean;
  initialOccurrence?: ActivityOccurrence | null;
  selectedDate: string;
  userId: string;
  onSave: (data: {
    template: RoutineTemplate;
    singleOccurrenceOverride?: {
      modifiedStartTime: string;
      modifiedEndTime: string;
      modifiedTitle: string;
      notes: string;
    };
  }) => void;
  onDelete?: (templateId: string) => void;
  onClose: () => void;
}

const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b', // slate
];

const DAYS_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ActivityEditorDialog({
  isOpen,
  initialOccurrence,
  selectedDate,
  userId,
  onSave,
  onDelete,
  onClose,
}: ActivityEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('work');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isFixed, setIsFixed] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [notifications, setNotifications] = useState<NotificationRule[]>([]);
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOccurrence) {
      setTitle(initialOccurrence.title);
      setCategory(initialOccurrence.category);
      setStartTime(initialOccurrence.startTime);
      setEndTime(initialOccurrence.endTime);
      setIsFixed(initialOccurrence.isFixed);
      setFrequency(initialOccurrence.template.recurrence.frequency);
      setDaysOfWeek(initialOccurrence.template.recurrence.daysOfWeek || [1, 2, 3, 4, 5]);
      setNotifications(initialOccurrence.notifications || []);
      setNotes(initialOccurrence.notes || '');
      setColor(initialOccurrence.color || '#3b82f6');
    } else {
      setTitle('');
      setCategory('work');
      setStartTime('09:00');
      setEndTime('10:00');
      setIsFixed(false);
      setFrequency('daily');
      setDaysOfWeek([1, 2, 3, 4, 5]);
      setNotifications([{ id: `notif_${Date.now()}`, type: 'start', offsetMinutes: 0, enabled: true }]);
      setNotes('');
      setColor('#3b82f6');
    }
    setError(null);
  }, [initialOccurrence, isOpen]);

  if (!isOpen) return null;

  const durationMinutes = calculateDuration(startTime, endTime);

  const handleToggleDay = (dayIndex: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleAddNotification = (type: 'advance' | 'start' | 'end', offsetMinutes: number) => {
    const newRule: NotificationRule = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type,
      offsetMinutes,
      enabled: true,
    };
    setNotifications((prev) => [...prev, newRule]);
  };

  const handleRemoveNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an activity title');
      return;
    }
    if (durationMinutes <= 0) {
      setError('End time must be after start time');
      return;
    }

    const templateId = initialOccurrence?.templateId || `template_${Date.now()}`;
    const template: RoutineTemplate = {
      id: templateId,
      userId,
      title: title.trim(),
      category,
      startTime,
      endTime,
      isFixed,
      recurrence: {
        frequency,
        daysOfWeek: frequency === 'custom' || frequency === 'weekly' ? daysOfWeek : [],
        startDate: initialOccurrence?.template.recurrence.startDate || selectedDate,
        endDate: initialOccurrence?.template.recurrence.endDate || null,
        exceptions: initialOccurrence?.template.recurrence.exceptions || [],
      },
      notifications,
      notes: notes.trim(),
      color,
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: initialOccurrence?.template.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave({ template });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-white/10 p-5 sm:p-7 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h2 className="text-xl font-bold text-white tracking-tight">
              {initialOccurrence ? 'Edit Routine Activity' : 'Create Routine Activity'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Activity Title *
            </label>
            <input
              id="input-activity-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning Meditation, Work Block, Cycling"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>

          {/* Category & Fixed Commitment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Category
              </label>
              <select
                id="select-activity-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm capitalize"
              >
                {Object.keys(CATEGORY_CONFIG).map((catKey) => (
                  <option key={catKey} value={catKey} className="bg-slate-900 text-white">
                    {CATEGORY_CONFIG[catKey as ActivityCategory].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Commitment Level
              </label>
              <button
                type="button"
                onClick={() => setIsFixed(!isFixed)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                  isFixed
                    ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/80 border-white/10 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Lock className={`w-4 h-4 ${isFixed ? 'text-amber-400' : 'text-slate-500'}`} />
                  {isFixed ? 'Fixed Commitment' : 'Flexible Routine'}
                </span>
                <span className="text-[11px] opacity-75">
                  {isFixed ? 'Protected' : 'Auto-shiftable'}
                </span>
              </button>
            </div>
          </div>

          {/* Time Bounds & Duration */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Start Time
                </label>
                <input
                  id="input-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> End Time
                </label>
                <input
                  id="input-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Calculated Duration:</span>
              <span className="font-semibold text-blue-300">
                {formatDuration(durationMinutes)}
              </span>
            </div>
          </div>

          {/* Recurrence Pattern */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" /> Recurrence Pattern
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekdays', label: 'Weekdays' },
                { id: 'weekends', label: 'Weekends' },
                { id: 'custom', label: 'Custom' },
                { id: 'once', label: 'One-time' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setFrequency(item.id as RecurrenceFrequency)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition ${
                    frequency === item.id
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                      : 'bg-slate-800/80 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {frequency === 'custom' && (
              <div className="flex items-center justify-between gap-1 pt-2">
                {DAYS_NAMES.map((dName, dIdx) => (
                  <button
                    type="button"
                    key={dName}
                    onClick={() => handleToggleDay(dIdx)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold border transition ${
                      daysOfWeek.includes(dIdx)
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-800/80 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {dName[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Native Local Reminders */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-400" /> Smartwatch & Phone Reminders
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddNotification('advance', -10)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 10m before
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNotification('start', 0)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> At start
                </button>
              </div>
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-1.5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/60 border border-white/5 text-xs text-slate-300"
                  >
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3 h-3 text-amber-400" />
                      {n.type === 'start' && 'At start of activity (exact)'}
                      {n.type === 'end' && 'At end of activity'}
                      {n.type === 'advance' && `${Math.abs(n.offsetMinutes)} minutes before`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNotification(n.id)}
                      className="text-slate-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No reminders scheduled for this routine block.</p>
            )}
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-400" /> Accent Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white shadow-lg' : 'hover:scale-110 opacity-70'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Notes & Guidelines
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions, context, checklists, or details..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            {initialOccurrence && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(initialOccurrence.templateId)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/60 rounded-xl border border-rose-500/30 transition"
              >
                <Trash2 className="w-4 h-4" /> Delete Routine
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                id="btn-save-activity"
                type="submit"
                className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition"
              >
                Save Activity
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
