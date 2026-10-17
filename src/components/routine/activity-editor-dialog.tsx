'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RoutineTemplate,
  ActivityCategory,
  RecurrenceFrequency,
  NotificationRule,
  ActivityOccurrence,
  MediaAttachment,
} from '@/types/routine';
import { calculateDuration, formatDuration } from '@/lib/time-utils';
import { CATEGORY_CONFIG } from './activity-badge';
import {
  saveLocalMediaBlob,
  deleteLocalMediaBlob,
  detectMediaType,
  formatFileSize,
} from '@/lib/media/media-storage';
import { MediaPlayerModal } from '@/components/media/media-player-modal';
import {
  X,
  Lock,
  Bell,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Palette,
  Music,
  Video,
  Upload,
  Play,
  Link2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { YouTubeIcon as Youtube } from '@/components/media/youtube-icon';
import { AiActionConfig } from '@/types/ai';
import { AiActionRepository } from '@/lib/repositories/ai-action-repository';

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
      modifiedMedia?: MediaAttachment[];
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
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [aiActionId, setAiActionId] = useState('');
  const [availableAiActions, setAvailableAiActions] = useState<AiActionConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Media link & upload states
  const [urlInput, setUrlInput] = useState('');
  const [urlTitleInput, setUrlTitleInput] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview player state
  const [previewOccurrence, setPreviewOccurrence] = useState<ActivityOccurrence | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    setAvailableAiActions(AiActionRepository.getLocalActions(userId));

    if (initialOccurrence) {
      setTitle(initialOccurrence.title);
      setCategory(initialOccurrence.category);
      setStartTime(initialOccurrence.startTime);
      setEndTime(initialOccurrence.endTime);
      setIsFixed(initialOccurrence.isFixed);
      setFrequency(initialOccurrence.template.recurrence.frequency);
      setDaysOfWeek(initialOccurrence.template.recurrence.daysOfWeek || [1, 2, 3, 4, 5]);
      setNotifications(initialOccurrence.notifications || []);
      setMedia(initialOccurrence.media || initialOccurrence.template.media || []);
      setAiActionId(initialOccurrence.aiActionId || initialOccurrence.template.aiActionId || '');
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
      setMedia([]);
      setAiActionId('');
      setNotes('');
      setColor('#3b82f6');
    }
    setUrlInput('');
    setUrlTitleInput('');
    setError(null);
  }, [initialOccurrence, isOpen, userId]);

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

  const handleAddUrlMedia = () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;

    const detectedType = detectMediaType(trimmedUrl);
    const fallbackTitle =
      detectedType === 'youtube'
        ? 'YouTube Video'
        : detectedType === 'audio_url'
        ? 'Audio Stream'
        : 'Video Stream';

    const newAttachment: MediaAttachment = {
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: detectedType,
      title: urlTitleInput.trim() || fallbackTitle,
      url: trimmedUrl,
      createdAt: Date.now(),
    };

    setMedia((prev) => [...prev, newAttachment]);
    setUrlInput('');
    setUrlTitleInput('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFile(true);
      const attachmentId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await saveLocalMediaBlob(attachmentId, file);

      const newAttachment: MediaAttachment = {
        id: attachmentId,
        type: 'local_file',
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        localKey: attachmentId,
        createdAt: Date.now(),
      };

      setMedia((prev) => [...prev, newAttachment]);
    } catch (err) {
      console.error('Failed to attach downloaded file:', err);
      setError('Failed to store downloaded file offline.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = (item: MediaAttachment) => {
    if (item.type === 'local_file' && item.localKey) {
      deleteLocalMediaBlob(item.localKey).catch((err) =>
        console.warn('Could not remove media blob:', err)
      );
    }
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
  };

  const handlePreviewMedia = (index: number) => {
    // Construct preview occurrence
    const dummyTemplate: RoutineTemplate = {
      id: initialOccurrence?.templateId || 'preview_template',
      userId,
      title: title.trim() || 'Activity Media Preview',
      category,
      startTime,
      endTime,
      isFixed,
      recurrence: {
        frequency,
        daysOfWeek,
        startDate: selectedDate,
        exceptions: [],
      },
      notifications,
      media,
      notes: notes.trim(),
      color,
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const previewOcc: ActivityOccurrence = {
      occurrenceId: `preview_${Date.now()}`,
      templateId: dummyTemplate.id,
      date: selectedDate,
      title: dummyTemplate.title,
      category: dummyTemplate.category,
      startTime: dummyTemplate.startTime,
      endTime: dummyTemplate.endTime,
      durationMinutes,
      isFixed: dummyTemplate.isFixed,
      notes: dummyTemplate.notes,
      color: dummyTemplate.color,
      notifications: dummyTemplate.notifications,
      media,
      hasOverride: false,
      isCancelled: false,
      isPostponed: false,
      template: dummyTemplate,
    };

    setPreviewOccurrence(previewOcc);
    setPreviewIndex(index);
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
      media,
      aiActionId: aiActionId || undefined,
      notes: notes.trim(),
      color,
      timezone: 'Asia/Kolkata',
      isArchived: initialOccurrence?.template.isArchived ?? false,
      archivedAt: initialOccurrence?.template.archivedAt ?? null,
      createdAt: initialOccurrence?.template.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave({
      template,
      singleOccurrenceOverride: {
        modifiedStartTime: startTime,
        modifiedEndTime: endTime,
        modifiedTitle: title.trim(),
        notes: notes.trim(),
        modifiedMedia: media,
      },
    });
  };

  return (
    <>
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Start Time
                  </label>
                  <input
                    id="input-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> End Time
                  </label>
                  <input
                    id="input-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Calculated Duration:</span>
                <span className="font-semibold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-white/5">
                  {durationMinutes > 0 ? formatDuration(durationMinutes) : 'Invalid range'}
                </span>
              </div>
            </div>

            {/* Recurrence Rule */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Recurrence Pattern
                </label>
                <span className="text-[11px] text-slate-400 capitalize">{frequency}</span>
              </div>

              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm capitalize"
              >
                <option value="daily">Every Day</option>
                <option value="weekdays">Weekdays (Mon – Fri)</option>
                <option value="weekends">Weekends (Sat & Sun)</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom Days</option>
                <option value="once">One-Time Only</option>
              </select>

              {(frequency === 'weekly' || frequency === 'custom') && (
                <div className="pt-2">
                  <label className="block text-[11px] text-slate-400 mb-1.5">Active Days:</label>
                  <div className="flex items-center justify-between gap-1">
                    {DAYS_NAMES.map((dayName, idx) => {
                      const isSelected = daysOfWeek.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => handleToggleDay(idx)}
                          className={`w-9 h-9 rounded-xl text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {dayName[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Media & Attachments Section */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-rose-500" />
                    <Music className="w-4 h-4 text-emerald-400" />
                    Media & Links
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    YouTube links, music streams, or downloaded audio/video
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition disabled:opacity-50"
                >
                  {isUploadingFile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> Attach Downloaded File
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="audio/*,video/*"
                  className="hidden"
                />
              </div>

              {/* Web link input */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Paste YouTube link or music/video stream URL..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/90 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    value={urlTitleInput}
                    onChange={(e) => setUrlTitleInput(e.target.value)}
                    placeholder="Link title (optional)"
                    className="w-full sm:w-40 px-3 py-2 rounded-xl bg-slate-800/90 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlMedia}
                    disabled={!urlInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition disabled:opacity-40 shrink-0 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Link
                  </button>
                </div>
              </div>

              {/* List of attachments */}
              {media.length > 0 ? (
                <div className="space-y-2">
                  {media.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-800 shrink-0">
                          {item.type === 'youtube' ? (
                            <Youtube className="w-4 h-4 text-rose-500" />
                          ) : item.type === 'audio_url' || (item.type === 'local_file' && item.mimeType?.startsWith('audio/')) ? (
                            <Music className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Video className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 truncate">
                            {item.title || item.fileName || 'Media Item'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.type === 'youtube'
                              ? 'YouTube Video'
                              : item.type === 'local_file'
                              ? `Downloaded File (${formatFileSize(item.fileSize)})`
                              : item.type === 'audio_url'
                              ? 'Audio Link'
                              : 'Video Link'}
                            {item.url && ` • ${item.url}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePreviewMedia(idx)}
                          title="Preview / Play Media"
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/60 transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(item)}
                          title="Remove Media"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No media or links added to this routine yet.</p>
              )}
            </div>

            {/* Smart Reminders */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" /> Smart Reminders
                </label>
                <div className="flex items-center gap-1">
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

            {/* Attached AI Routine Action */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Attached AI Routine Action
                </label>
                <span className="text-[10px] text-slate-400">On-demand execution</span>
              </div>

              <select
                value={aiActionId}
                onChange={(e) => setAiActionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="">None (Standard Routine)</option>
                {availableAiActions.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.name} ({act.outputFormat})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                When attached, an <strong>Execute AI</strong> trigger appears on the routine card to run briefings, reflections, or summaries.
              </p>
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

      {/* Embedded Test Player Modal inside Editor */}
      {previewOccurrence && (
        <MediaPlayerModal
          isOpen={Boolean(previewOccurrence)}
          occurrence={previewOccurrence}
          initialMediaIndex={previewIndex}
          onClose={() => setPreviewOccurrence(null)}
        />
      )}
    </>
  );
}
