'use client';

import React, { useState } from 'react';
import {
  LifeGoal,
  GoalDomain,
  GoalPriority,
  GoalChecklistItem,
  GoalComment,
  GoalActivityRecord,
  GoalTrackedItem,
  GoalPhase,
  GoalNamedList,
  GoalExperienceEntry,
  GoalMilestone,
} from '@/types/goals';
import { RoutineTemplate } from '@/types/routine';
import { GoalEditorModal } from './goal-editor-modal';
import { LogProgressModal } from './log-progress-modal';
import { LogActivityModal } from './log-activity-modal';
import { ItemEditorModal } from './item-editor-modal';
import { ItemQuickProgress } from './item-quick-progress';
import { LogItemProgressModal } from './log-item-progress-modal';
import {
  Target,
  Plus,
  Heart,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Edit2,
  Trash2,
  Sparkles,
  BookOpen,
  GraduationCap,
  Scale,
  Rocket,
  Check,
  Search,
  ListChecks,
  Activity,
  MessageSquare,
  History,
  Send,
  X,
  Flame,
  Headphones,
  Folder,
  Link as LinkIcon,
  Star,
  Copy,
  ExternalLink,
  Layers,
  FileText,
  Compass,
  Tag,
  Smile,
  AlertCircle,
  Lightbulb,
  RotateCcw,
  Milestone,
} from 'lucide-react';

interface GoalsDashboardProps {
  userId: string;
  goals: LifeGoal[];
  templates?: RoutineTemplate[];
  onSaveGoal: (goal: LifeGoal) => Promise<void> | void;
  onDeleteGoal: (goalId: string) => Promise<void> | void;
  onLogProgress: (goalId: string, valueChange: number, note: string, date: string) => Promise<void> | void;
  onToggleMilestone: (goalId: string, milestoneId: string) => Promise<void> | void;
  onAddMilestone?: (
    goalId: string,
    data: { title: string; description?: string; targetDate?: string }
  ) => Promise<void> | void;
  onDeleteMilestone?: (goalId: string, milestoneId: string) => Promise<void> | void;
  onAddChecklistItem?: (goalId: string, text: string) => Promise<void> | void;
  onToggleChecklistItem?: (goalId: string, itemId: string) => Promise<void> | void;
  onDeleteChecklistItem?: (goalId: string, itemId: string) => Promise<void> | void;
  onAddComment?: (goalId: string, text: string) => Promise<void> | void;
  onUpdateComment?: (goalId: string, commentId: string, text: string) => Promise<void> | void;
  onDeleteComment?: (goalId: string, commentId: string) => Promise<void> | void;
  onRecordActivity?: (
    goalId: string,
    data: {
      date: string;
      activityTitle: string;
      durationMinutes: number;
      notes: string;
      templateId?: string;
      incrementProgress: boolean;
    }
  ) => Promise<void> | void;
  onSaveTrackedItem?: (
    goalId: string,
    itemData: Omit<GoalTrackedItem, 'id' | 'createdAt' | 'updatedAt'>,
    itemId?: string
  ) => Promise<void> | void;
  onDeleteTrackedItem?: (goalId: string, itemId: string) => Promise<void> | void;
  onUpdateItemProgress?: (
    goalId: string,
    itemId: string,
    currentUnits: number,
    markCompleted?: boolean
  ) => Promise<void> | void;
  onLogItemProgress?: (
    goalId: string,
    itemId: string,
    data: {
      deltaUnits?: number;
      setAbsoluteUnits?: number;
      note?: string;
      date?: string;
      markCompleted?: boolean;
    }
  ) => Promise<void> | void;
  onUndoProgressLog?: (goalId: string, logId: string) => Promise<void> | void;

  // Structured Phase Roadmap Handlers
  onTogglePhaseStatus?: (goalId: string, phaseId: string) => Promise<void> | void;
  onAddPhaseTask?: (goalId: string, phaseId: string, text: string) => Promise<void> | void;
  onTogglePhaseTask?: (goalId: string, phaseId: string, taskId: string) => Promise<void> | void;
  onDeletePhaseTask?: (goalId: string, phaseId: string, taskId: string) => Promise<void> | void;

  // Custom Lists Handlers
  onAddNamedList?: (goalId: string, title: string) => Promise<void> | void;
  onAddListItem?: (goalId: string, listId: string, text: string) => Promise<void> | void;
  onToggleListItem?: (goalId: string, listId: string, itemId: string) => Promise<void> | void;
  onDeleteListItem?: (goalId: string, listId: string, itemId: string) => Promise<void> | void;

  // Experience Journal Handlers
  onAddExperience?: (
    goalId: string,
    data: Omit<GoalExperienceEntry, 'id' | 'createdAt'>
  ) => Promise<void> | void;
  onDeleteExperience?: (goalId: string, entryId: string) => Promise<void> | void;
}

export function GoalsDashboard({
  userId,
  goals,
  templates = [],
  onSaveGoal,
  onDeleteGoal,
  onLogProgress,
  onToggleMilestone,
  onAddMilestone,
  onDeleteMilestone,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onRecordActivity,
  onSaveTrackedItem,
  onDeleteTrackedItem,
  onUpdateItemProgress,
  onLogItemProgress,
  onUndoProgressLog,
  onTogglePhaseStatus,
  onAddPhaseTask,
  onTogglePhaseTask,
  onDeletePhaseTask,
  onAddNamedList,
  onAddListItem,
  onToggleListItem,
  onDeleteListItem,
  onAddExperience,
  onDeleteExperience,
}: GoalsDashboardProps) {
  const [selectedDomain, setSelectedDomain] = useState<'all' | GoalDomain>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | GoalPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<LifeGoal | null>(null);

  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressGoal, setProgressGoal] = useState<LifeGoal | null>(null);

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityGoal, setActivityGoal] = useState<LifeGoal | null>(null);

  // Tracked item modal (Books / Courses)
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [activeItemGoal, setActiveItemGoal] = useState<LifeGoal | null>(null);
  const [editingItem, setEditingItem] = useState<GoalTrackedItem | null>(null);

  // Minor item progress modal
  const [itemProgressModalOpen, setItemProgressModalOpen] = useState(false);
  const [selectedItemForLog, setSelectedItemForLog] = useState<{ goal: LifeGoal; item: GoalTrackedItem } | null>(null);

  // Clipboard feedback
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Card Tab state: goalId -> 'tracker' | 'phases' | 'milestones' | 'lists' | 'experiences' | 'items' | 'activity' | 'notes'
  const [activeCardTabs, setActiveCardTabs] = useState<
    Record<string, 'tracker' | 'phases' | 'milestones' | 'lists' | 'experiences' | 'items' | 'activity' | 'notes'>
  >({});

  // Active sub-list inside lists tab: goalId -> listId
  const [activeSubLists, setActiveSubLists] = useState<Record<string, string>>({});

  // Card collapse state: goalId -> boolean (true = collapsed to compact summary)
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Phase collapse state: `${goalId}_${phaseId}` -> boolean (true = steps hidden)
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});

  const toggleCardCollapse = (goalId: string) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const togglePhaseCollapse = (goalId: string, phaseId: string, defaultCollapsed: boolean = true) => {
    const key = `${goalId}_${phaseId}`;
    setCollapsedPhases((prev) => {
      const current = prev[key] !== undefined ? prev[key] : defaultCollapsed;
      return {
        ...prev,
        [key]: !current,
      };
    });
  };

  const toggleAllPhasesForGoal = (goalId: string, phases: GoalPhase[]) => {
    const isAnyExpanded = phases.some((ph) => {
      const key = `${goalId}_${ph.id}`;
      const isCollapsed =
        collapsedPhases[key] !== undefined ? collapsedPhases[key] : true;
      return !isCollapsed;
    });

    const nextState: Record<string, boolean> = { ...collapsedPhases };
    phases.forEach((ph) => {
      nextState[`${goalId}_${ph.id}`] = isAnyExpanded;
    });
    setCollapsedPhases(nextState);
  };

  // Inline inputs state
  const [checklistInputs, setChecklistInputs] = useState<Record<string, string>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [phaseTaskInputs, setPhaseTaskInputs] = useState<Record<string, string>>({});
  const [milestoneInputs, setMilestoneInputs] = useState<Record<string, { title: string; date: string }>>({});
  const [listItemInputs, setListItemInputs] = useState<Record<string, string>>({});
  const [newListInputs, setNewListInputs] = useState<Record<string, string>>({});

  // Experience form state: goalId -> { open, title, content, type, mood, tags }
  const [experienceFormOpen, setExperienceFormOpen] = useState<Record<string, boolean>>({});
  const [expTitleInputs, setExpTitleInputs] = useState<Record<string, string>>({});
  const [expContentInputs, setExpContentInputs] = useState<Record<string, string>>({});
  const [expTypeInputs, setExpTypeInputs] = useState<Record<string, GoalExperienceEntry['type']>>({});
  const [expMoodInputs, setExpMoodInputs] = useState<Record<string, number>>({});
  const [expTagsInputs, setExpTagsInputs] = useState<Record<string, string>>({});

  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Compute metrics
  const totalCount = goals.length;
  const personalCount = goals.filter((g) => g.domain === 'personal').length;
  const professionalCount = goals.filter((g) => g.domain === 'professional').length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;

  const totalActivitiesLogged = goals.reduce((acc, g) => acc + (g.activityRecords?.length || 0), 0);
  const totalMinutesInvested = goals.reduce(
    (acc, g) => acc + (g.activityRecords?.reduce((a, r) => a + (r.durationMinutes || 0), 0) || 0),
    0
  );
  const totalHoursInvested = (totalMinutesInvested / 60).toFixed(1);

  // Filter goals
  const filteredGoals = goals.filter((goal) => {
    if (selectedDomain !== 'all' && goal.domain !== selectedDomain) return false;
    if (selectedPriority !== 'all' && (goal.priority || 'medium') !== selectedPriority) return false;
    if (statusFilter !== 'all' && goal.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = goal.title.toLowerCase().includes(q);
      const matchDesc = goal.description?.toLowerCase().includes(q);
      const matchCategory = goal.category?.toLowerCase().includes(q);
      const matchMotivation = goal.motivation?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCategory && !matchMotivation) return false;
    }
    return true;
  });

  const getPriorityBadge = (priority: GoalPriority = 'medium') => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <Flame className="w-2.5 h-2.5 text-rose-400" />
            <span>P0 Critical</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span>P1 High</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <span>P2 Medium</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <span>P3 Low</span>
          </span>
        );
    }
  };

  const getTrackingModeBadge = (mode: string = 'tasks') => {
    switch (mode) {
      case 'phases':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Layers className="w-2.5 h-2.5" />
            <span>Phases</span>
          </span>
        );
      case 'tasks':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <ListChecks className="w-2.5 h-2.5" />
            <span>Tasks</span>
          </span>
        );
      case 'metric':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Target className="w-2.5 h-2.5" />
            <span>Metric</span>
          </span>
        );
      case 'habits':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Activity className="w-2.5 h-2.5" />
            <span>Habit Streak</span>
          </span>
        );
      case 'journey':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Compass className="w-2.5 h-2.5" />
            <span>Journey</span>
          </span>
        );
    }
  };

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatActivityDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatCommentDate = (ts: number) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleCopyPath = (path: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2500);
    }
  };

  const handleAddCommentSubmit = async (goalId: string) => {
    const text = (commentInputs[goalId] || '').trim();
    if (!text || !onAddComment) return;
    await onAddComment(goalId, text);
    setCommentInputs((prev) => ({ ...prev, [goalId]: '' }));
  };

  const handleSaveEditedComment = async (goalId: string, commentId: string) => {
    if (!editingCommentText.trim() || !onUpdateComment) return;
    await onUpdateComment(goalId, commentId, editingCommentText.trim());
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handlePostExperienceSubmit = async (goalId: string) => {
    const title = (expTitleInputs[goalId] || '').trim();
    const content = (expContentInputs[goalId] || '').trim();
    if (!title || !content) return;

    const type = expTypeInputs[goalId] || 'reflection';
    const mood = expMoodInputs[goalId] || 5;
    const rawTags = (expTagsInputs[goalId] || '').trim();
    const tags = rawTags
      ? rawTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    if (onAddExperience) {
      const today = new Date().toISOString().split('T')[0];
      await onAddExperience(goalId, {
        date: today,
        title,
        content,
        type,
        moodRating: mood,
        tags,
      });
    }

    setExperienceFormOpen((prev) => ({ ...prev, [goalId]: false }));
    setExpTitleInputs((prev) => ({ ...prev, [goalId]: '' }));
    setExpContentInputs((prev) => ({ ...prev, [goalId]: '' }));
    setExpTagsInputs((prev) => ({ ...prev, [goalId]: '' }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Hero Overview Banner */}
      <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Universal Life Goal Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Life Goals, Roadmaps & Growth
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Flexible tracking for any ambition: structured phases, customizable lists, experience reflections, habit synchronization, and velocity tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingGoal(null);
              setEditorOpen(true);
            }}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Goal</span>
          </button>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Goals</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{totalCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">targets</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400 block">Personal</span>
              <Heart className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-300">{personalCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">aspirations</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-blue-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-400 block">Professional</span>
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-300">{professionalCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">milestones</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 block">Invested Habit Time</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{totalActivitiesLogged}</span>
              <span className="text-[11px] text-amber-400 font-semibold">{totalHoursInvested}h routine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Navigation Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md space-y-3">
        {/* Row 1: Domain Tabs + Priority Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Domain Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedDomain('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[34px] flex items-center gap-1.5 ${
                selectedDomain === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>All ({totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDomain('personal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[34px] flex items-center gap-1.5 ${
                selectedDomain === 'personal'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Personal ({personalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDomain('professional')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[34px] flex items-center gap-1.5 ${
                selectedDomain === 'professional'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Professional ({professionalCount})</span>
            </button>
          </div>

          {/* Priority Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-slate-500 font-medium mr-1 hidden sm:inline">Priority:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'critical', label: 'P0 Critical' },
              { id: 'high', label: 'P1 High' },
              { id: 'medium', label: 'P2 Medium' },
              { id: 'low', label: 'P3 Low' },
            ].map((p) => {
              const active = selectedPriority === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPriority(p.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-slate-700 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Search + Status */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals by title, motivation, category, or notes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-800/80 border border-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-800/80 border border-white/5 text-slate-300 focus:outline-none focus:border-blue-500 min-h-[34px]"
          >
            <option value="all">Status: All</option>
            <option value="in_progress">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGoals.map((goal) => {
            const isCompleted = goal.status === 'completed';
            const progressPercent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
            const daysLeft = getDaysRemaining(goal.targetDate);

            // Compute active tab for card
            const defaultTab =
              goal.trackingMode === 'phases' && goal.phases && goal.phases.length > 0
                ? 'phases'
                : (goal.trackingMode === 'milestones' || (goal.milestones && goal.milestones.length > 0))
                ? 'milestones'
                : goal.items && goal.items.length > 0
                ? 'items'
                : goal.lists && goal.lists.length > 0
                ? 'lists'
                : 'tracker';

            const isCardCollapsed = Boolean(collapsedCards[goal.id]);
            const activeTab = activeCardTabs[goal.id] || defaultTab;

            const phases = goal.phases || [];
            const totalPhaseSteps = phases.reduce(
              (acc, p) => acc + (p.tasks && p.tasks.length > 0 ? p.tasks.length : 1),
              0
            );
            const completedPhaseSteps = phases.reduce((acc, p) => {
              if (p.tasks && p.tasks.length > 0) {
                return acc + p.tasks.filter((t) => t.isCompleted).length;
              }
              return acc + (p.status === 'completed' ? 1 : 0);
            }, 0);
            const completedPhasesCount = phases.filter((p) => p.status === 'completed').length;

            const milestones = goal.milestones || [];
            const completedMilestonesCount = milestones.filter((m) => m.isCompleted).length;

            const lists = goal.lists || [];
            const totalListTasks = lists.reduce((acc, l) => acc + (l.items?.length || 0), 0);
            const completedListTasks = lists.reduce(
              (acc, l) => acc + (l.items?.filter((i) => i.isCompleted).length || 0),
              0
            );

            const experiences = goal.experiences || [];
            const comments = goal.comments || [];
            const activities = goal.activityRecords || [];
            const trackedItems = goal.items || [];
            const completedItemsCount = trackedItems.filter((i) => i.status === 'completed').length;

            const goalMinutes = activities.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
            const goalHours = (goalMinutes / 60).toFixed(1);

            // Active list inside lists tab
            const activeListId = activeSubLists[goal.id] || lists[0]?.id;
            const currentList = lists.find((l) => l.id === activeListId) || lists[0];

            return (
              <div
                key={goal.id}
                className="group relative p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-white/20 transition-all duration-200 shadow-xl space-y-4 backdrop-blur-md flex flex-col justify-between"
              >
                {/* Header Row */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Priority Badge */}
                      {getPriorityBadge(goal.priority)}

                      {/* Domain Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          goal.domain === 'personal'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {goal.domain === 'personal' ? (
                          <Heart className="w-2.5 h-2.5" />
                        ) : (
                          <Briefcase className="w-2.5 h-2.5" />
                        )}
                        <span>{goal.domain}</span>
                      </span>

                      {/* Tracking Mode Pill */}
                      {getTrackingModeBadge(goal.trackingMode)}

                      {/* Category Pill */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-white/5">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{goal.category}</span>
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => toggleCardCollapse(goal.id)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isCardCollapsed
                            ? 'text-blue-400 bg-blue-950/60 border border-blue-500/30 hover:bg-blue-900/60'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={isCardCollapsed ? 'Expand Details' : 'Collapse Card'}
                      >
                        {isCardCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGoal(goal);
                          setEditorOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Delete goal "${goal.title}"?`)) {
                            await onDeleteGoal(goal.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  {/* Motivation Quote if specified */}
                  {!isCardCollapsed && goal.motivation && (
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-indigo-500/25 text-xs text-indigo-200/90 flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="italic leading-relaxed">"{goal.motivation}"</span>
                    </div>
                  )}
                </div>

                {/* --- PROGRESS BAR SECTION --- */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      {isCompleted ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Goal Accomplished!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-300 font-semibold">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                          <span>Progress</span>
                        </span>
                      )}
                    </span>

                    <div className="flex items-baseline gap-1.5">
                      <strong className="text-base font-black text-white">{goal.currentValue}</strong>
                      <span className="text-slate-400 text-xs">
                        /{' '}
                        {goal.targetValue}{' '}
                        {goal.unit ||
                          (goal.trackingMode === 'phases'
                            ? 'steps'
                            : goal.trackingMode === 'milestones'
                            ? 'milestones'
                            : goal.trackingMode === 'tasks'
                            ? 'tasks'
                            : goal.trackingMode === 'items'
                            ? 'items'
                            : 'units')}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-md ml-1 shadow-sm"
                        style={{
                          backgroundColor: `${goal.color}25`,
                          color: goal.color,
                        }}
                      >
                        {progressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Gauge */}
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 relative">
                    <div
                      className="h-full rounded-full transition-all duration-500 shadow-md"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>

                  {/* Date & countdown */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>Deadline: {goal.targetDate}</span>
                    </span>

                    {isCompleted ? (
                      <span className="text-emerald-400 font-bold">Accomplished ✓</span>
                    ) : daysLeft > 0 ? (
                      <span className={`font-semibold ${daysLeft <= 14 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {daysLeft} days remaining
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">Overdue</span>
                    )}
                  </div>
                </div>

                {!isCardCollapsed && (
                  <>
                    {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-1 border-b border-white/10 pb-1 text-xs overflow-x-auto no-scrollbar">
                  {/* Roadmap / Phases Tab */}
                  {(goal.phases?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveCardTabs((prev) => ({ ...prev, [goal.id]: 'phases' }))}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] flex items-center gap-1 shrink-0 ${
                        activeTab === 'phases'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>
                        Roadmap ({completedPhaseSteps}/{totalPhaseSteps} steps)
                      </span>
                    </button>
                  )}

                  {/* Key Milestones & Steps Tab */}
                  {(goal.trackingMode === 'milestones' || (goal.milestones?.length || 0) > 0 || !(goal.phases?.length)) && (
                    <button
                      type="button"
                      onClick={() => setActiveCardTabs((prev) => ({ ...prev, [goal.id]: 'milestones' }))}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] flex items-center gap-1 shrink-0 ${
                        activeTab === 'milestones'
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Milestone className="w-3 h-3" />
                      <span>Milestones ({completedMilestonesCount}/{milestones.length})</span>
                    </button>
                  )}

                  {/* Custom Lists Tab */}
                  {(goal.lists?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveCardTabs((prev) => ({ ...prev, [goal.id]: 'lists' }))}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] flex items-center gap-1 shrink-0 ${
                        activeTab === 'lists'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ListChecks className="w-3 h-3" />
                      <span>Lists ({completedListTasks}/{totalListTasks})</span>
                    </button>
                  )}

                  {/* Experiences & Reflections Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveCardTabs((prev) => ({ ...prev, [goal.id]: 'experiences' }))}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] flex items-center gap-1 shrink-0 ${
                      activeTab === 'experiences'
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass className="w-3 h-3" />
                    <span>Experiences ({experiences.length})</span>
                  </button>

                  {/* Tracked items tab (Books/Courses) */}
                  {(goal.items?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveCardTabs((prev) => ({ ...prev, [goal.id]: 'items' }))}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] flex items-center gap-1 shrink-0 ${
                        activeTab === 'items'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Items ({completedItemsCount}/{trackedItems.length})</span>
                    </button>
                  )}

                  {/* Overview tab */}
                  <button
                    type="button"
                    onClick={() => setActiveCardTabs((prev) => ({ ...prev, [goal.id]: 'tracker' }))}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] flex items-center gap-1 shrink-0 ${
                      activeTab === 'tracker' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Overview</span>
                  </button>

                  {/* Activities tab */}
                  <button
                    type="button"
                    onClick={() => setActiveCardTabs((prev) => ({ ...prev, [goal.id]: 'activity' }))}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] flex items-center gap-1 shrink-0 ${
                      activeTab === 'activity'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    <span>Activities ({activities.length})</span>
                  </button>

                  {/* Comments / Notes tab */}
                  <button
                    type="button"
                    onClick={() => setActiveCardTabs((prev) => ({ ...prev, [goal.id]: 'notes' }))}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] flex items-center gap-1 shrink-0 ${
                      activeTab === 'notes'
                        ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Notes ({comments.length})</span>
                  </button>
                </div>

                {/* --- TAB CONTENT 1: PHASES & ROADMAP --- */}
                {activeTab === 'phases' && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Roadmap Stages & Deliverables</span>
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-normal">
                        <button
                          type="button"
                          onClick={() => toggleAllPhasesForGoal(goal.id, phases)}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 hover:border-purple-500/50 transition cursor-pointer"
                        >
                          {phases.some((ph) => {
                            const key = `${goal.id}_${ph.id}`;
                            const isCollapsed =
                              collapsedPhases[key] !== undefined
                                ? collapsedPhases[key]
                                : true;
                            return !isCollapsed;
                          })
                            ? 'Collapse All'
                            : 'Expand All'}
                        </button>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                          {completedPhaseSteps}/{totalPhaseSteps} Steps Done
                        </span>
                        <span>
                          ({completedPhasesCount}/{phases.length} Phases)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {phases.map((ph, idx) => {
                        const isPhaseDone = ph.status === 'completed';
                        const phaseTotalTasks = ph.tasks?.length || 0;
                        const phaseDoneTasks = ph.tasks?.filter((t) => t.isCompleted).length || 0;
                        const phasePercent =
                          phaseTotalTasks > 0
                            ? Math.round((phaseDoneTasks / phaseTotalTasks) * 100)
                            : isPhaseDone
                            ? 100
                            : 0;
                        const phaseKey = `${goal.id}_${ph.id}`;
                        const isPhaseCollapsed =
                          collapsedPhases[phaseKey] !== undefined
                            ? collapsedPhases[phaseKey]
                            : true;

                        return (
                          <div
                            key={ph.id}
                            className={`rounded-xl border transition-all ${
                              isPhaseDone
                                ? 'bg-purple-950/20 border-purple-500/30'
                                : 'bg-slate-900/80 border-slate-800'
                            }`}
                          >
                            <div
                              onClick={() => togglePhaseCollapse(goal.id, ph.id, true)}
                              className="p-3 flex items-start justify-between gap-2 cursor-pointer hover:bg-white/[0.02] rounded-xl transition"
                            >
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <div className="text-slate-400 mt-0.5 shrink-0">
                                  {isPhaseCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-purple-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-purple-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${
                                        isPhaseDone
                                          ? 'bg-purple-500 text-white'
                                          : 'bg-purple-500/20 text-purple-300'
                                      }`}
                                    >
                                      {isPhaseDone ? '✓' : idx + 1}
                                    </span>
                                    <span className={`truncate ${isPhaseDone ? 'line-through text-slate-400' : ''}`}>
                                      {ph.title}
                                    </span>
                                    {phaseTotalTasks > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 font-medium shrink-0">
                                        {phaseDoneTasks}/{phaseTotalTasks} steps ({phasePercent}%)
                                      </span>
                                    )}
                                  </div>
                                  {ph.description && (
                                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                      {ph.description}
                                    </p>
                                  )}
                                  {phaseTotalTasks > 0 && (
                                    <div className="mt-1.5 w-32 bg-slate-800 rounded-full h-1 overflow-hidden">
                                      <div
                                        className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                                        style={{ width: `${phasePercent}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePhaseStatus && onTogglePhaseStatus(goal.id, ph.id);
                                }}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition cursor-pointer shrink-0 ${
                                  isPhaseDone
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-purple-500'
                                }`}
                              >
                                {isPhaseDone ? 'Done ✓' : 'Mark Complete'}
                              </button>
                            </div>

                            {/* Phase steps */}
                            {!isPhaseCollapsed && (
                              <div className="px-3 pb-3 pt-0 ml-6 space-y-1">
                                {ph.tasks?.map((task) => (
                                  <div
                                    key={task.id}
                                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-950/60 border border-slate-800/80"
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer flex-1 truncate">
                                      <input
                                        type="checkbox"
                                        checked={task.isCompleted}
                                        onChange={() =>
                                          onTogglePhaseTask && onTogglePhaseTask(goal.id, ph.id, task.id)
                                        }
                                        className="w-3.5 h-3.5 rounded text-purple-600 bg-slate-900 border-slate-700 cursor-pointer"
                                      />
                                      <span
                                        className={`text-[11px] truncate ${
                                          task.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'
                                        }`}
                                      >
                                        {task.text}
                                      </span>
                                    </label>
                                    {onDeletePhaseTask && (
                                      <button
                                        type="button"
                                        onClick={() => onDeletePhaseTask(goal.id, ph.id, task.id)}
                                        className="text-slate-500 hover:text-rose-400 ml-1.5"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}

                                {/* Quick add step */}
                                {onAddPhaseTask && (
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <input
                                      type="text"
                                      value={phaseTaskInputs[`${goal.id}_${ph.id}`] || ''}
                                      onChange={(e) =>
                                        setPhaseTaskInputs({
                                          ...phaseTaskInputs,
                                          [`${goal.id}_${ph.id}`]: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const text = (phaseTaskInputs[`${goal.id}_${ph.id}`] || '').trim();
                                          if (text) {
                                            onAddPhaseTask(goal.id, ph.id, text);
                                            setPhaseTaskInputs({
                                              ...phaseTaskInputs,
                                              [`${goal.id}_${ph.id}`]: '',
                                            });
                                          }
                                        }
                                      }}
                                      placeholder="Add step to this phase..."
                                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const text = (phaseTaskInputs[`${goal.id}_${ph.id}`] || '').trim();
                                        if (text) {
                                          onAddPhaseTask(goal.id, ph.id, text);
                                          setPhaseTaskInputs({
                                            ...phaseTaskInputs,
                                            [`${goal.id}_${ph.id}`]: '',
                                          });
                                        }
                                      }}
                                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg"
                                    >
                                      Add
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- TAB CONTENT: KEY MILESTONES & STEPS --- */}
                {activeTab === 'milestones' && (
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Milestone className="w-3.5 h-3.5" />
                        <span>Key Milestones & Steps</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {completedMilestonesCount}/{milestones.length} Completed
                      </span>
                    </div>

                    {/* Milestones Progress Bar */}
                    {milestones.length > 0 && (
                      <div className="space-y-1">
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-amber-400 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round(
                                (completedMilestonesCount / Math.max(1, milestones.length)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Milestones list */}
                    <div className="space-y-1.5">
                      {milestones.length === 0 ? (
                        <div className="text-center py-6 px-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/30">
                          <Milestone className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                          <p className="text-xs text-slate-400 font-medium">No milestones yet</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Add intermediate checkpoints below to track steps closer to your final goal.
                          </p>
                        </div>
                      ) : (
                        milestones.map((ms, idx) => (
                          <div
                            key={ms.id}
                            className={`flex items-start justify-between gap-2 text-xs py-2 px-2.5 rounded-xl border transition-all ${
                              ms.isCompleted
                                ? 'bg-amber-950/20 border-amber-500/25'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={ms.isCompleted}
                                onChange={() => onToggleMilestone && onToggleMilestone(goal.id, ms.id)}
                                className="mt-0.5 w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-400 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-xs font-medium truncate ${
                                      ms.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'
                                    }`}
                                  >
                                    {ms.title}
                                  </span>
                                  {ms.targetDate && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center gap-0.5">
                                      <Calendar className="w-2.5 h-2.5" />
                                      <span>{ms.targetDate}</span>
                                    </span>
                                  )}
                                  {ms.isCompleted && (
                                    <span className="text-[10px] text-amber-400 font-semibold">Done ✓</span>
                                  )}
                                </div>
                                {ms.description && (
                                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                    {ms.description}
                                  </p>
                                )}
                              </div>
                            </label>

                            {onDeleteMilestone && (
                              <button
                                type="button"
                                onClick={() => onDeleteMilestone(goal.id, ms.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                                title="Delete milestone"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Inline Quick Add Milestone */}
                    {onAddMilestone && (
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={milestoneInputs[goal.id]?.title || ''}
                            onChange={(e) =>
                              setMilestoneInputs({
                                ...milestoneInputs,
                                [goal.id]: {
                                  title: e.target.value,
                                  date: milestoneInputs[goal.id]?.date || '',
                                },
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const current = milestoneInputs[goal.id];
                                const text = (current?.title || '').trim();
                                if (text) {
                                  onAddMilestone(goal.id, {
                                    title: text,
                                    targetDate: current?.date || undefined,
                                  });
                                  setMilestoneInputs({
                                    ...milestoneInputs,
                                    [goal.id]: { title: '', date: '' },
                                  });
                                }
                              }
                            }}
                            placeholder="Add small milestone to move closer to goal..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <input
                            type="date"
                            value={milestoneInputs[goal.id]?.date || ''}
                            onChange={(e) =>
                              setMilestoneInputs({
                                ...milestoneInputs,
                                [goal.id]: {
                                  title: milestoneInputs[goal.id]?.title || '',
                                  date: e.target.value,
                                },
                              })
                            }
                            className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = milestoneInputs[goal.id];
                              const text = (current?.title || '').trim();
                              if (text) {
                                onAddMilestone(goal.id, {
                                  title: text,
                                  targetDate: current?.date || undefined,
                                });
                                setMilestoneInputs({
                                  ...milestoneInputs,
                                  [goal.id]: { title: '', date: '' },
                                });
                              }
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-medium rounded-lg transition cursor-pointer shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB CONTENT 2: CUSTOM LISTS & TASKS --- */}
                {activeTab === 'lists' && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                    {/* List switcher pills */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                      {lists.map((lst) => {
                        const isSubActive = lst.id === currentList?.id;
                        const doneCount = lst.items?.filter((i) => i.isCompleted).length || 0;
                        return (
                          <button
                            key={lst.id}
                            type="button"
                            onClick={() =>
                              setActiveSubLists((prev) => ({ ...prev, [goal.id]: lst.id }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                              isSubActive
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span>{lst.title}</span>
                            <span className="text-[10px] opacity-75">
                              ({doneCount}/{lst.items?.length || 0})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active list items */}
                    {currentList && (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          {currentList.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-900/90 border border-slate-800"
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1 truncate">
                                <input
                                  type="checkbox"
                                  checked={item.isCompleted}
                                  onChange={() =>
                                    onToggleListItem &&
                                    onToggleListItem(goal.id, currentList.id, item.id)
                                  }
                                  className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-900 border-slate-700 cursor-pointer"
                                />
                                <span
                                  className={`text-xs truncate ${
                                    item.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'
                                  }`}
                                >
                                  {item.text}
                                </span>
                              </label>
                              {onDeleteListItem && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onDeleteListItem(goal.id, currentList.id, item.id)
                                  }
                                  className="text-slate-500 hover:text-rose-400 ml-2"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add item to active list */}
                        {onAddListItem && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={listItemInputs[`${goal.id}_${currentList.id}`] || ''}
                              onChange={(e) =>
                                setListItemInputs({
                                  ...listItemInputs,
                                  [`${goal.id}_${currentList.id}`]: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const text = (
                                    listItemInputs[`${goal.id}_${currentList.id}`] || ''
                                  ).trim();
                                  if (text) {
                                    onAddListItem(goal.id, currentList.id, text);
                                    setListItemInputs({
                                      ...listItemInputs,
                                      [`${goal.id}_${currentList.id}`]: '',
                                    });
                                  }
                                }
                              }}
                              placeholder={`Add task to ${currentList.title}...`}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const text = (
                                  listItemInputs[`${goal.id}_${currentList.id}`] || ''
                                ).trim();
                                if (text) {
                                  onAddListItem(goal.id, currentList.id, text);
                                  setListItemInputs({
                                    ...listItemInputs,
                                    [`${goal.id}_${currentList.id}`]: '',
                                  });
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB CONTENT 3: EXPERIENCE & REFLECTION JOURNAL --- */}
                {activeTab === 'experiences' && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Experience & Journey Reflections</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExperienceFormOpen((prev) => ({ ...prev, [goal.id]: !prev[goal.id] }))
                        }
                        className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Share Reflection</span>
                      </button>
                    </div>

                    {/* Inline Experience Share Form */}
                    {experienceFormOpen[goal.id] && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-2.5 animate-in fade-in-50 duration-150">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                          <span>Log an Experience or Breakthrough</span>
                          <button
                            type="button"
                            onClick={() =>
                              setExperienceFormOpen((prev) => ({ ...prev, [goal.id]: false }))
                            }
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={expTitleInputs[goal.id] || ''}
                          onChange={(e) =>
                            setExpTitleInputs({ ...expTitleInputs, [goal.id]: e.target.value })
                          }
                          placeholder="Highlight title (e.g. Broke personal record, Solved tough bug)..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />

                        <textarea
                          rows={2}
                          value={expContentInputs[goal.id] || ''}
                          onChange={(e) =>
                            setExpContentInputs({ ...expContentInputs, [goal.id]: e.target.value })
                          }
                          placeholder="What did you learn? What worked? Any challenges or thoughts?"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                        />

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {/* Type Selector */}
                          <div className="flex gap-1">
                            {(
                              [
                                { id: 'reflection', label: 'Reflection' },
                                { id: 'breakthrough', label: 'Breakthrough' },
                                { id: 'blocker', label: 'Blocker' },
                                { id: 'milestone', label: 'Milestone' },
                              ] as const
                            ).map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() =>
                                  setExpTypeInputs({ ...expTypeInputs, [goal.id]: t.id })
                                }
                                className={`text-[10px] px-2 py-0.5 rounded border ${
                                  (expTypeInputs[goal.id] || 'reflection') === t.id
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                                    : 'bg-slate-950 text-slate-400 border-slate-800'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePostExperienceSubmit(goal.id)}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition"
                          >
                            Post Reflection
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Timeline of Experiences */}
                    {experiences.length === 0 ? (
                      <div className="p-4 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500 text-xs">
                        No reflections logged yet. Click "Share Reflection" to document your journey!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {experiences.map((exp) => (
                          <div
                            key={exp.id}
                            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">{exp.title}</span>
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 capitalize">
                                  {exp.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500">
                                <span>{exp.date}</span>
                                {onDeleteExperience && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteExperience(goal.id, exp.id)}
                                    className="text-slate-500 hover:text-rose-400"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">{exp.content}</p>

                            {exp.tags && exp.tags.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                {exp.tags.map((tg, i) => (
                                  <span key={i} className="text-[10px] text-cyan-400/80 font-mono">
                                    {tg.startsWith('#') ? tg : `#${tg}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB CONTENT 4: TRACKED ITEMS (BOOKS, COURSES, AUDIO, PAGES) --- */}
                {activeTab === 'items' && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        <span>Tracked Items & Materials</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveItemGoal(goal);
                          setEditingItem(null);
                          setItemModalOpen(true);
                        }}
                        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {trackedItems.map((item) => {
                        const itemDone = item.status === 'completed';
                        const itemPercent =
                          item.totalUnits > 0
                            ? Math.min(100, Math.round((item.currentUnits / item.totalUnits) * 100))
                            : 0;

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all ${
                              itemDone
                                ? 'bg-slate-900/50 border-slate-800 opacity-90'
                                : 'bg-slate-900/90 border-slate-700/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                  {itemDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                  <span className={itemDone ? 'line-through text-slate-400' : ''}>
                                    {item.title}
                                  </span>
                                </div>
                                {item.authorOrInstructor && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    by {item.authorOrInstructor}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveItemGoal(goal);
                                    setEditingItem(item);
                                    setItemModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-white"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                {onDeleteTrackedItem && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTrackedItem(goal.id, item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-400"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Pages / Modules Progress Bar */}
                            {item.totalUnits > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">
                                    {item.currentUnits} / {item.totalUnits} {item.unitLabel}
                                  </span>
                                  <span className="font-bold text-blue-400">{itemPercent}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${itemPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Summary & Notes snippet */}
                            {item.summary && (
                              <p className="text-[11px] text-slate-300 mt-2 bg-slate-950/60 p-2 rounded-lg italic">
                                "{item.summary}"
                              </p>
                            )}

                            {/* Links & File Paths */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {item.primaryLink && (
                                <a
                                  href={item.primaryLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Web Link</span>
                                </a>
                              )}
                              {item.audioLinkOrPath && (
                                <span className="text-[10px] text-purple-300 flex items-center gap-1">
                                  <Headphones className="w-2.5 h-2.5" />
                                  <span>Audio</span>
                                </span>
                              )}
                              {item.localFilePath && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyPath(item.localFilePath!)}
                                  className="text-[10px] text-amber-300 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>{copiedPath === item.localFilePath ? 'Copied!' : 'Copy Path'}</span>
                                </button>
                              )}
                            </div>

                            {/* Minor Progress Quick Controls */}
                            <ItemQuickProgress
                              goalId={goal.id}
                              item={item}
                              onLogQuickIncrement={async (gId, iId, delta) => {
                                if (onLogItemProgress) {
                                  await onLogItemProgress(gId, iId, { deltaUnits: delta });
                                } else if (onUpdateItemProgress) {
                                  await onUpdateItemProgress(gId, iId, item.currentUnits + delta);
                                }
                              }}
                              onOpenCustomLog={(it) => {
                                setSelectedItemForLog({ goal, item: it });
                                setItemProgressModalOpen(true);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- TAB CONTENT 5: OVERVIEW & STATS --- */}
                {activeTab === 'tracker' && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Activities</span>
                        <strong className="text-white text-sm font-bold">{activities.length}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Invested</span>
                        <strong className="text-emerald-400 text-sm font-bold">{goalHours}h</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Progress Logs</span>
                        <strong className="text-blue-400 text-sm font-bold">{(goal.progressLogs || []).length}</strong>
                      </div>
                    </div>

                    {/* Progress History Log Entries with Undo */}
                    {(goal.progressLogs || []).length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                          <span>Recent Progress History</span>
                          <span className="text-[10px] text-slate-500">{(goal.progressLogs || []).length} logs</span>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                          {(goal.progressLogs || []).slice(0, 10).map((log) => (
                            <div
                              key={log.id}
                              className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {log.itemTitle ? (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-300 truncate max-w-[130px]">
                                      {log.itemTitle}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-300">
                                      Goal
                                    </span>
                                  )}
                                  <span className="font-extrabold text-emerald-400 text-xs">
                                    {log.valueChange >= 0 ? `+${log.valueChange}` : log.valueChange} {log.unitLabel || goal.unit}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {log.date}
                                  </span>
                                </div>
                                {log.note && (
                                  <p className="text-[11px] text-slate-300 truncate max-w-[260px]">
                                    "{log.note}"
                                  </p>
                                )}
                              </div>
                              {onUndoProgressLog && (
                                <button
                                  type="button"
                                  onClick={() => onUndoProgressLog(goal.id, log.id)}
                                  className="p-1 rounded-md text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer shrink-0"
                                  title="Undo progress entry"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setProgressGoal(goal);
                        setProgressModalOpen(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition cursor-pointer"
                    >
                      + Log Whole Goal Progress
                    </button>
                  </div>
                )}

                {/* --- TAB CONTENT 6: DAILY ACTIVITIES --- */}
                {activeTab === 'activity' && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span>Daily Routine History ({activities.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setActivityGoal(goal);
                          setActivityModalOpen(true);
                        }}
                        className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Log Session</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {activities.map((act) => (
                        <div
                          key={act.id}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{act.activityTitle}</span>
                            <span className="text-[10px] text-slate-500">{act.date}</span>
                          </div>
                          {act.durationMinutes > 0 && (
                            <span className="text-[10px] text-amber-300 block">
                              Duration: {act.durationMinutes} mins
                            </span>
                          )}
                          {act.notes && (
                            <p className="text-[11px] text-slate-400 italic">"{act.notes}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- TAB CONTENT 7: GENERAL NOTES --- */}
                {activeTab === 'notes' && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                    <div className="text-xs font-bold text-indigo-300">Notes & Reflections</div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {comments.map((comm) => (
                        <div
                          key={comm.id}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>{formatCommentDate(comm.createdAt)}</span>
                            {onDeleteComment && (
                              <button
                                type="button"
                                onClick={() => onDeleteComment(goal.id, comm.id)}
                                className="text-slate-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-slate-200 text-xs">{comm.text}</p>
                        </div>
                      ))}
                    </div>

                    {onAddComment && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={commentInputs[goal.id] || ''}
                          onChange={(e) =>
                            setCommentInputs({ ...commentInputs, [goal.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCommentSubmit(goal.id);
                            }
                          }}
                          placeholder="Add a quick note..."
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCommentSubmit(goal.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                )}
                  </>
                )}

                {/* Compact summary bar when card is collapsed */}
                {isCardCollapsed && (
                  <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px] text-slate-400">
                      {goal.phases?.length ? `${goal.phases.length} phases • ` : ''}
                      {completedPhaseSteps}/{totalPhaseSteps} steps completed
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCardCollapse(goal.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Show Details</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-dashed border-white/10 space-y-3">
          <Compass className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No goals matching criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search or filters, or define a new goal to begin your journey.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingGoal(null);
              setEditorOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
          >
            + Create New Goal
          </button>
        </div>
      )}

      {/* Editor Modal */}
      <GoalEditorModal
        isOpen={editorOpen}
        userId={userId}
        initialGoal={editingGoal}
        templates={templates}
        onClose={() => {
          setEditorOpen(false);
          setEditingGoal(null);
        }}
        onSave={async (goal) => {
          await onSaveGoal(goal);
          setEditorOpen(false);
          setEditingGoal(null);
        }}
        onDelete={onDeleteGoal}
      />

      {/* Numeric Progress Modal */}
      {progressGoal && (
        <LogProgressModal
          isOpen={progressModalOpen}
          goal={progressGoal}
          onClose={() => {
            setProgressModalOpen(false);
            setProgressGoal(null);
          }}
          onSaveProgress={async (goalId: string, val: number, note: string, date: string) => {
            await onLogProgress(goalId, val, note, date);
            setProgressModalOpen(false);
            setProgressGoal(null);
          }}
        />
      )}

      {/* Activity Session Modal */}
      {activityGoal && (
        <LogActivityModal
          isOpen={activityModalOpen}
          goal={activityGoal}
          templates={templates}
          onClose={() => {
            setActivityModalOpen(false);
            setActivityGoal(null);
          }}
          onRecordActivity={async (data) => {
            if (onRecordActivity) {
              await onRecordActivity(activityGoal.id, data);
            }
            setActivityModalOpen(false);
            setActivityGoal(null);
          }}
        />
      )}

      {/* Tracked Item Modal */}
      {activeItemGoal && (
        <ItemEditorModal
          isOpen={itemModalOpen}
          category={activeItemGoal.category}
          initialItem={editingItem}
          onClose={() => {
            setItemModalOpen(false);
            setActiveItemGoal(null);
            setEditingItem(null);
          }}
          onSave={async (itemData) => {
            if (onSaveTrackedItem) {
              await onSaveTrackedItem(activeItemGoal.id, itemData, editingItem?.id);
            }
            setItemModalOpen(false);
            setActiveItemGoal(null);
            setEditingItem(null);
          }}
        />
      )}

      {/* Minor Item Progress Modal */}
      {selectedItemForLog && (
        <LogItemProgressModal
          isOpen={itemProgressModalOpen}
          goal={selectedItemForLog.goal}
          item={selectedItemForLog.item}
          onClose={() => {
            setItemProgressModalOpen(false);
            setSelectedItemForLog(null);
          }}
          onSaveItemProgress={async (gId, iId, data) => {
            if (onLogItemProgress) {
              await onLogItemProgress(gId, iId, data);
            }
          }}
        />
      )}
    </div>
  );
}
