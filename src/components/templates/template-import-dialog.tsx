'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileCheck,
  AlertCircle,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';
import { DayRoutineTemplate, TemplateImportExport } from '@/types/routine-templates';
import { TemplateIO } from '@/lib/templates/template-io';
import { calculateDuration, formatTime12Hour } from '@/lib/time-utils';

interface TemplateImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  existingTemplates: DayRoutineTemplate[];
  onImportSuccess: (importedTemplate: DayRoutineTemplate) => Promise<void> | void;
}

export function TemplateImportDialog({
  isOpen,
  onClose,
  userId,
  existingTemplates,
  onImportSuccess,
}: TemplateImportDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [parsedData, setParsedData] = useState<TemplateImportExport | null>(null);
  const [collisionMode, setCollisionMode] = useState<'copy' | 'overwrite'>('copy');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.json')) {
      setError('Please select a valid .json routine template file.');
      return;
    }

    if (file.size > 1024 * 1024) {
      setError('Template file size must be less than 1 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const res = TemplateIO.parseAndValidateTemplateJson(content);
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to parse template JSON.');
        setParsedData(null);
      } else {
        setParsedData(res.data);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Error reading file from disk.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;
    setImporting(true);
    setError(null);

    try {
      const prepared = TemplateIO.prepareImportedTemplate(
        userId,
        parsedData,
        existingTemplates,
        { collisionMode }
      );
      await onImportSuccess(prepared);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete template import.');
    } finally {
      setImporting(false);
    }
  };

  const nameCollision = parsedData
    ? existingTemplates.find(
        (t) => t.name.trim().toLowerCase() === parsedData.template.name.trim().toLowerCase()
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Routine Template</h2>
              <p className="text-xs text-slate-400">Upload a single-template JSON package</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!parsedData ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 hover:border-white/20 bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">Choose a JSON file or drag it here</p>
              <p className="text-xs text-slate-400 mt-1">Exported My Routine template (.json)</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Template Preview Card */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: parsedData.template.color || '#3b82f6' }}
                    />
                    <h3 className="text-sm font-bold text-white">{parsedData.template.name}</h3>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <FileCheck className="w-3 h-3" />
                    Valid Template
                  </span>
                </div>

                {parsedData.template.description && (
                  <p className="text-xs text-slate-400">{parsedData.template.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{parsedData.template.blocks.length} activity blocks</span>
                  </span>
                  <span>•</span>
                  <span>
                    {(
                      parsedData.template.blocks.reduce(
                        (acc, b) => acc + calculateDuration(b.startTime, b.endTime),
                        0
                      ) / 60
                    ).toFixed(1)}
                    h total
                  </span>
                </div>

                {/* Blocks Preview List */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pt-2">
                  {parsedData.template.blocks.map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900/60"
                    >
                      <span className="font-medium text-white truncate max-w-[200px]">{b.title}</span>
                      <span className="text-slate-400 shrink-0">
                        {formatTime12Hour(b.startTime)} – {formatTime12Hour(b.endTime)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collision Alert & Mode Selection */}
              {nameCollision && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>A template named &quot;{parsedData.template.name}&quot; already exists</span>
                  </div>

                  <div className="space-y-1.5 pl-6 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="collisionMode"
                        checked={collisionMode === 'copy'}
                        onChange={() => setCollisionMode('copy')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Create as new copy ({parsedData.template.name} (Imported))</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="collisionMode"
                        checked={collisionMode === 'overwrite'}
                        onChange={() => setCollisionMode('overwrite')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Overwrite existing template</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setParsedData(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Choose different file
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parsedData || importing}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Confirm & Import Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
