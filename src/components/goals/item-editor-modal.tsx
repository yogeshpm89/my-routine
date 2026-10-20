'use client';

import React, { useState, useEffect } from 'react';
import { GoalTrackedItem, GoalCustomField } from '@/types/goals';
import {
  X,
  BookOpen,
  GraduationCap,
  Headphones,
  Link as LinkIcon,
  Folder,
  Star,
  Plus,
  Trash2,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ItemEditorModalProps {
  isOpen: boolean;
  category: string; // 'reading' | 'education' | etc.
  initialItem?: GoalTrackedItem | null;
  onClose: () => void;
  onSave: (itemData: Omit<GoalTrackedItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
}

export function ItemEditorModal({
  isOpen,
  category,
  initialItem,
  onClose,
  onSave,
}: ItemEditorModalProps) {
  const isReading = category === 'reading';
  const isEducation = category === 'education';

  const defaultType = isReading ? 'book' : isEducation ? 'course' : 'other';
  const defaultUnitLabel = isReading ? 'pages' : isEducation ? 'modules' : 'units';

  const [title, setTitle] = useState('');
  const [authorOrInstructor, setAuthorOrInstructor] = useState('');
  const [itemType, setItemType] = useState<GoalTrackedItem['itemType']>(defaultType);
  const [status, setStatus] = useState<GoalTrackedItem['status']>('in_progress');
  const [currentUnits, setCurrentUnits] = useState<string>('0');
  const [totalUnits, setTotalUnits] = useState<string>(isReading ? '300' : '5');
  const [unitLabel, setUnitLabel] = useState(defaultUnitLabel);
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [primaryLink, setPrimaryLink] = useState('');
  const [audioLinkOrPath, setAudioLinkOrPath] = useState('');
  const [localFilePath, setLocalFilePath] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [customFields, setCustomFields] = useState<GoalCustomField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setAuthorOrInstructor(initialItem.authorOrInstructor || '');
      setItemType(initialItem.itemType);
      setStatus(initialItem.status);
      setCurrentUnits(initialItem.currentUnits?.toString() || '0');
      setTotalUnits(initialItem.totalUnits?.toString() || '0');
      setUnitLabel(initialItem.unitLabel || defaultUnitLabel);
      setSummary(initialItem.summary || '');
      setNotes(initialItem.notes || '');
      setPrimaryLink(initialItem.primaryLink || '');
      setAudioLinkOrPath(initialItem.audioLinkOrPath || '');
      setLocalFilePath(initialItem.localFilePath || '');
      setRating(initialItem.rating);
      setCustomFields(initialItem.customFields || []);
    } else {
      setTitle('');
      setAuthorOrInstructor('');
      setItemType(defaultType);
      setStatus('in_progress');
      setCurrentUnits('0');
      setTotalUnits(isReading ? '300' : '5');
      setUnitLabel(defaultUnitLabel);
      setSummary('');
      setNotes('');
      setPrimaryLink('');
      setAudioLinkOrPath('');
      setLocalFilePath('');
      setRating(undefined);
      setCustomFields([]);
    }
  }, [initialItem, isOpen, category, defaultType, defaultUnitLabel, isReading]);

  if (!isOpen) return null;

  const handleAddCustomField = () => {
    const newF: GoalCustomField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: '',
      value: '',
    };
    setCustomFields([...customFields, newF]);
  };

  const handleUpdateCustomField = (id: string, key: 'label' | 'value', val: string) => {
    setCustomFields(customFields.map((f) => (f.id === id ? { ...f, [key]: val } : f)));
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedCurrent = parseFloat(currentUnits) || 0;
    const parsedTotal = parseFloat(totalUnits) || 0;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        itemType,
        authorOrInstructor: authorOrInstructor.trim() || undefined,
        status,
        currentUnits: parsedCurrent,
        totalUnits: parsedTotal,
        unitLabel: unitLabel.trim() || defaultUnitLabel,
        summary: summary.trim(),
        notes: notes.trim(),
        primaryLink: primaryLink.trim() || undefined,
        audioLinkOrPath: audioLinkOrPath.trim() || undefined,
        localFilePath: localFilePath.trim() || undefined,
        rating,
        customFields: customFields.filter((f) => f.label.trim().length > 0),
        links: initialItem?.links || [],
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 text-white my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
              {isReading ? (
                <BookOpen className="w-5 h-5" />
              ) : isEducation ? (
                <GraduationCap className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                {initialItem
                  ? `Edit ${isReading ? 'Book' : isEducation ? 'Course / Resource' : 'Item'}`
                  : `Add ${isReading ? 'Book' : isEducation ? 'Course / Resource' : 'Item'}`}
              </h3>
              <p className="text-xs text-slate-400">
                Track pages, audio links, local file paths, summaries, and custom notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isReading ? 'Book Title' : isEducation ? 'Course / Module Name' : 'Item Title'}{' '}
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  isReading
                    ? 'e.g. Atomic Habits, Deep Work'
                    : isEducation
                    ? 'e.g. Generative AI with LLMs'
                    : 'e.g. Project or Resource Name'
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isReading ? 'Author' : isEducation ? 'Instructor / Org' : 'Creator / Source'}
              </label>
              <input
                type="text"
                value={authorOrInstructor}
                onChange={(e) => setAuthorOrInstructor(e.target.value)}
                placeholder={isReading ? 'e.g. James Clear' : 'e.g. Andrew Ng'}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status & Rating */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="in_progress">
                  {isReading ? '📖 Currently Reading' : '⚡ In Progress'}
                </option>
                <option value="not_started">⏳ Queued / Not Started</option>
                <option value="completed">✓ Completed</option>
              </select>
            </div>

            {/* Star Rating */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Rating</label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? undefined : star)}
                    className="p-1 text-slate-600 hover:text-amber-400 transition cursor-pointer"
                    title={`${star} star`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        rating && rating >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                {rating && (
                  <span className="text-[11px] text-amber-300 font-bold ml-1">{rating}/5</span>
                )}
              </div>
            </div>
          </div>

          {/* Pages / Modules Units Progress */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-white/5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block">
                {isReading ? 'Current Page' : 'Completed Units'}
              </label>
              <input
                type="number"
                min="0"
                value={currentUnits}
                onChange={(e) => setCurrentUnits(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block">
                {isReading ? 'Total Pages' : 'Total Units'}
              </label>
              <input
                type="number"
                min="0"
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block">Unit Label</label>
              <input
                type="text"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="pages, modules"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Summary & Key Takeaways */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{isReading ? 'Book Summary & Key Takeaways' : 'Course Summary & Overview'}</span>
              <span className="text-[10px] text-slate-500">Core ideas & insights</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={
                isReading
                  ? 'Key summary: The 4 laws of behavior change — make it obvious, attractive, easy, and satisfying...'
                  : 'Key summary: Foundations of LLM architecture, Transformer self-attention, and LoRA fine-tuning...'
              }
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Detailed Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Detailed Notes & Reflections</span>
              <span className="text-[10px] text-slate-500">Quotes, formulas, code snippets</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detailed lecture notes, favorite book quotes, exercise thoughts..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Audio Link & Local File Paths */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-800/40 border border-white/5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-blue-400" />
              <span>Audiobook Link or Local File Path</span>
            </span>

            {/* Audiobook Link or Audio File */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block">
                Audiobook Link (Audible, Spotify, etc.) OR Local Audio Path
              </label>
              <div className="relative">
                <Headphones className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={audioLinkOrPath}
                  onChange={(e) => setAudioLinkOrPath(e.target.value)}
                  placeholder="https://audible.com/... OR C:\Audiobooks\DeepWork.m4b"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Course / Web Link */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block">
                {isReading ? 'Goodreads / Book URL' : 'Course Platform / Syllabus Link'}
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={primaryLink}
                  onChange={(e) => setPrimaryLink(e.target.value)}
                  placeholder="https://coursera.org/learn/... OR https://goodreads.com/..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Local Document or Notes File Path */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block">
                Local PDF / EPUB / Notes File Path
              </label>
              <div className="relative">
                <Folder className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={localFilePath}
                  onChange={(e) => setLocalFilePath(e.target.value)}
                  placeholder="C:\Users\...\Books\book.epub OR /Users/.../slides.pdf"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Flexible Customizable Key-Value Fields */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-800/40 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Custom Properties ({customFields.length})</span>
              </span>
              <button
                type="button"
                onClick={handleAddCustomField}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[3]" /> Add Field
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Add any custom property: e.g. Genre, Format, Edition, Certificate Link, Target Speed.
            </p>

            {customFields.length > 0 && (
              <div className="space-y-2 pt-1">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateCustomField(field.id, 'label', e.target.value)}
                      placeholder="Property (e.g. Genre)"
                      className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleUpdateCustomField(field.id, 'value', e.target.value)}
                      placeholder="Value (e.g. Behavioral Science)"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(field.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : initialItem
                ? 'Update Item'
                : isReading
                ? 'Add Book'
                : isEducation
                ? 'Add Course'
                : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
