'use client';

import React, { useState } from 'react';
import { Layers, CalendarDays, Plus, Upload, CheckCircle2 } from 'lucide-react';
import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { TemplateManagementView } from './template-management-view';
import { WeeklyPlannerView } from './weekly-planner-view';
import { TemplateEditorModal } from './template-editor-modal';
import { TemplateImportDialog } from './template-import-dialog';
import { ApplyTemplateDialog } from './apply-template-dialog';
import { DayTemplateRepository } from '@/lib/repositories/day-template-repository';

interface TemplatesDashboardProps {
  userId: string;
  templates: DayRoutineTemplate[];
  planner: WeeklyPlannerConfig;
  onSaveTemplate: (template: DayRoutineTemplate) => Promise<void> | void;
  onDeleteTemplate: (templateId: string) => Promise<void> | void;
  onDuplicateTemplate: (template: DayRoutineTemplate) => Promise<void> | void;
  onSavePlanner: (config: WeeklyPlannerConfig) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
}

export function TemplatesDashboard({
  userId,
  templates,
  planner,
  onSaveTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  onSavePlanner,
  onRefresh,
}: TemplatesDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'planner'>('templates');

  // Modals state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DayRoutineTemplate | null>(null);

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyTemplate, setApplyTemplate] = useState<DayRoutineTemplate | null>(null);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (tpl: DayRoutineTemplate) => {
    setEditingTemplate(tpl);
    setEditorOpen(true);
  };

  const handleOpenApply = (tpl: DayRoutineTemplate) => {
    setApplyTemplate(tpl);
    setApplyDialogOpen(true);
  };

  const handleSetDayAssignment = async (dayOfWeek: number, templateId: string) => {
    const updatedAssignments = {
      ...planner.assignments,
      [String(dayOfWeek)]: templateId,
    };
    await onSavePlanner({
      ...planner,
      assignments: updatedAssignments,
    });
  };

  const handleSetDefaultFallback = async (templateId: string) => {
    await onSavePlanner({
      ...planner,
      defaultTemplateId: templateId,
    });
  };

  const handleCopyMonToWeekdays = async () => {
    const monTemplateId = planner.assignments['1'] || planner.defaultTemplateId;
    const updatedAssignments = {
      ...planner.assignments,
      '1': monTemplateId,
      '2': monTemplateId,
      '3': monTemplateId,
      '4': monTemplateId,
      '5': monTemplateId,
    };
    await onSavePlanner({
      ...planner,
      assignments: updatedAssignments,
    });
  };

  const handleCopySatToSun = async () => {
    const satTemplateId = planner.assignments['6'] || planner.defaultTemplateId;
    const updatedAssignments = {
      ...planner.assignments,
      '6': satTemplateId,
      '0': satTemplateId,
    };
    await onSavePlanner({
      ...planner,
      assignments: updatedAssignments,
    });
  };

  // Apply dialog actions
  const handleApplyToday = async (templateId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedDateOverrides = {
      ...planner.dateOverrides,
      [today]: templateId,
    };
    await onSavePlanner({
      ...planner,
      dateOverrides: updatedDateOverrides,
    });
    showNotification('Applied template to Today successfully!');
  };

  const handleApplyDateRange = async (templateId: string, startDate: string, endDate: string) => {
    const updatedDateOverrides = { ...planner.dateOverrides };
    let cur = new Date(startDate);
    const end = new Date(endDate);

    while (cur <= end) {
      const curStr = cur.toISOString().split('T')[0];
      updatedDateOverrides[curStr] = templateId;
      cur.setDate(cur.getDate() + 1);
    }

    await onSavePlanner({
      ...planner,
      dateOverrides: updatedDateOverrides,
    });
    showNotification(`Applied template from ${startDate} to ${endDate}!`);
  };

  const handleAssignDaysOfWeek = async (templateId: string, days: number[]) => {
    const updatedAssignments = { ...planner.assignments };
    days.forEach((d) => {
      updatedAssignments[String(d)] = templateId;
    });
    await onSavePlanner({
      ...planner,
      assignments: updatedAssignments,
    });
    showNotification('Assigned template across selected days of the week!');
  };

  const handleSetAsDefault = async (templateId: string) => {
    await onSavePlanner({
      ...planner,
      defaultTemplateId: templateId,
    });
    showNotification('Set as default fallback routine template!');
  };

  return (
    <div className="space-y-6">
      {/* Top Segmented Tab Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 p-1 bg-slate-900/90 border border-white/10 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeSubTab === 'templates'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Day Routine Templates ({templates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('planner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeSubTab === 'planner'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Weekly Schedule Planner</span>
          </button>
        </div>

        {notificationMsg && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notificationMsg}</span>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeSubTab === 'templates' ? (
        <TemplateManagementView
          templates={templates}
          planner={planner}
          onOpenCreate={handleCreateNew}
          onOpenImport={() => setImportDialogOpen(true)}
          onEditTemplate={handleEdit}
          onDuplicateTemplate={onDuplicateTemplate}
          onDeleteTemplate={onDeleteTemplate}
          onOpenApplyDialog={handleOpenApply}
        />
      ) : (
        <WeeklyPlannerView
          planner={planner}
          templates={templates}
          onSetDayAssignment={handleSetDayAssignment}
          onSetDefaultFallback={handleSetDefaultFallback}
          onCopyMondayToWeekdays={handleCopyMonToWeekdays}
          onCopySaturdayToSunday={handleCopySatToSun}
          onNavigateToTemplates={() => setActiveSubTab('templates')}
          onOpenEditorForTemplate={handleEdit}
        />
      )}

      {/* Modals */}
      <TemplateEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={editingTemplate}
        userId={userId}
        onSave={async (tpl) => {
          await onSaveTemplate(tpl);
          showNotification(`Saved template "${tpl.name}"!`);
        }}
      />

      <TemplateImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        userId={userId}
        existingTemplates={templates}
        onImportSuccess={async (imported) => {
          await onSaveTemplate(imported);
          showNotification(`Imported template "${imported.name}" successfully!`);
        }}
      />

      <ApplyTemplateDialog
        isOpen={applyDialogOpen}
        onClose={() => setApplyDialogOpen(false)}
        template={applyTemplate}
        planner={planner}
        onApplyToday={handleApplyToday}
        onApplyDateRange={handleApplyDateRange}
        onAssignDaysOfWeek={handleAssignDaysOfWeek}
        onSetAsDefault={handleSetAsDefault}
      />
    </div>
  );
}
