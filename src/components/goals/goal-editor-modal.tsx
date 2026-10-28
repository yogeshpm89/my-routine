'use client';

import React, { useState, useEffect } from 'react';
import {
  LifeGoal,
  GoalDomain,
  GoalPriority,
  GoalTrackingMode,
  GoalStatus,
  GoalMetricType,
  GoalPhase,
  GoalNamedList,
  GoalChecklistItem,
  GoalMilestone,
} from '@/types/goals';
import { RoutineTemplate } from '@/types/routine';
import { getTodayDateString, addDays } from '@/lib/time-utils';
import {
  X,
  Target,
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  Briefcase,
  Heart,
  CheckCircle2,
  ListTodo,
  Activity,
  Layers,
  Compass,
  FileText,
  Flame,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  GraduationCap,
  Scale,
  Rocket,
  Check,
  Milestone,
  Flag,
} from 'lucide-react';

interface GoalEditorModalProps {
  isOpen: boolean;
  userId: string;
  initialGoal?: LifeGoal | null;
  templates?: RoutineTemplate[];
  onClose: () => void;
  onSave: (goal: LifeGoal) => Promise<void> | void;
  onDelete?: (goalId: string) => Promise<void> | void;
}

const SUGGESTED_CATEGORIES = [
  'General',
  'Health & Fitness',
  'Career & Work',
  'Learning & Skills',
  'Reading',
  'Finance & Wealth',
  'Creative & Art',
  'Mindfulness',
  'Travel & Adventure',
  'Relationships',
  'Side Project',
];

const PRESET_TEMPLATES = [
  {
    label: '📚 Read 30 Books',
    domain: 'personal' as GoalDomain,
    category: 'Reading',
    priority: 'high' as GoalPriority,
    trackingMode: 'metric' as GoalTrackingMode,
    title: 'Read 30 books in 1 year',
    description: 'Expand mental models, leadership knowledge, and creative inspiration.',
    motivation: 'Continuous learning keeps the mind sharp and opens new career opportunities.',
    targetValue: 30,
    unit: 'books',
    daysToAdd: 365,
    timeframeLabel: '1 year',
    color: '#8b5cf6',
    phases: [],
    lists: [
      {
        id: 'list_reading_1',
        title: 'Curated Reading List',
        type: 'reading' as const,
        items: [
          { id: 'item_1', text: 'Atomic Habits by James Clear', isCompleted: false },
          { id: 'item_2', text: 'Deep Work by Cal Newport', isCompleted: false },
          { id: 'item_3', text: 'Thinking, Fast and Slow by Daniel Kahneman', isCompleted: false },
        ],
      },
      {
        id: 'list_reading_2',
        title: 'Action Habits',
        type: 'checklist' as const,
        items: [
          { id: 'item_4', text: 'Read 25 pages every morning during routine', isCompleted: false },
          { id: 'item_5', text: 'Write down 3 key takeaways after finishing each book', isCompleted: false },
        ],
      },
    ],
  },
  {
    label: '🎓 Gen AI Mastery',
    domain: 'professional' as GoalDomain,
    category: 'Learning & Skills',
    priority: 'critical' as GoalPriority,
    trackingMode: 'phases' as GoalTrackingMode,
    title: 'Master Generative AI & Agentic Workflows in 2 months',
    description: 'Build enterprise-grade AI agents, fine-tune models, and deploy production RAG pipelines.',
    motivation: 'To become a top-tier AI engineer and lead advanced engineering initiatives.',
    targetValue: 4,
    unit: 'phases',
    daysToAdd: 60,
    timeframeLabel: '2 months',
    color: '#3b82f6',
    phases: [
      {
        id: 'ph_1',
        title: 'Phase 1: Foundations of LLMs & Transformers',
        description: 'Attention mechanisms, tokenization, embeddings, and prompt architecture.',
        status: 'in_progress' as const,
        tasks: [
          { id: 't_1', text: 'Study Transformer Architecture paper', isCompleted: true },
          { id: 't_2', text: 'Build simple tokenizer and toy transformer in PyTorch', isCompleted: false },
        ],
      },
      {
        id: 'ph_2',
        title: 'Phase 2: Advanced RAG & Vector Databases',
        description: 'Hierarchical chunking, hybrid search, re-ranking, and caching.',
        status: 'not_started' as const,
        tasks: [
          { id: 't_3', text: 'Set up Qdrant vector database', isCompleted: false },
          { id: 't_4', text: 'Implement BM25 + dense embedding hybrid search pipeline', isCompleted: false },
        ],
      },
      {
        id: 'ph_3',
        title: 'Phase 3: Autonomous Agents & Tool Use',
        description: 'ReAct loops, function calling, planning subagents, and memory systems.',
        status: 'not_started' as const,
        tasks: [
          { id: 't_5', text: 'Implement multi-agent orchestrator with tools', isCompleted: false },
        ],
      },
      {
        id: 'ph_4',
        title: 'Phase 4: Production Deployment & Evaluation',
        description: 'LLM evaluation benchmarks, latency optimizations, and monitoring.',
        status: 'not_started' as const,
        tasks: [
          { id: 't_6', text: 'Deploy service to cloud with CI/CD and telemetry', isCompleted: false },
        ],
      },
    ],
    lists: [
      {
        id: 'list_res_ai',
        title: 'Key Papers & Courses',
        type: 'resources' as const,
        items: [
          { id: 'r_1', text: 'Attention Is All You Need (Vaswani et al.)', isCompleted: false },
          { id: 'r_2', text: 'DeepLearning.AI LangGraph & Agentic Design', isCompleted: false },
        ],
      },
    ],
  },
  {
    label: '⚖️ Peak Fitness & Weight',
    domain: 'personal' as GoalDomain,
    category: 'Health & Fitness',
    priority: 'high' as GoalPriority,
    trackingMode: 'habits' as GoalTrackingMode,
    title: 'Achieve peak physical fitness & lose 5 kg in 3 months',
    description: 'Sustainable nutrition, strength training, and cardiovascular endurance.',
    motivation: 'Feel energetic, improve longevity, and build lasting physical discipline.',
    targetValue: 60,
    unit: 'workouts',
    daysToAdd: 90,
    timeframeLabel: '3 months',
    color: '#10b981',
    phases: [],
    lists: [
      {
        id: 'list_fit_1',
        title: 'Non-Negotiable Daily Rules',
        type: 'checklist' as const,
        items: [
          { id: 'f_1', text: 'Drink 3 liters of water throughout the day', isCompleted: false },
          { id: 'f_2', text: '130g daily protein target', isCompleted: false },
          { id: 'f_3', text: '8,000 steps daily average', isCompleted: false },
          { id: 'f_4', text: 'No sugary drinks or midnight snacks', isCompleted: false },
        ],
      },
      {
        id: 'list_fit_2',
        title: 'Weekly Milestones',
        type: 'checklist' as const,
        items: [
          { id: 'f_5', text: 'Sunday morning weigh-in and waist measurement', isCompleted: false },
          { id: 'f_6', text: 'Meal prep high-protein lunches for weekdays', isCompleted: false },
        ],
      },
    ],
  },
  {
    label: '🚀 Launch Side-Project MVP',
    domain: 'professional' as GoalDomain,
    category: 'Side Project',
    priority: 'high' as GoalPriority,
    trackingMode: 'phases' as GoalTrackingMode,
    title: 'Design, build, and launch SaaS MVP product in 90 days',
    description: 'Validate idea with real paying customers and launch publicly.',
    motivation: 'Build financial freedom and bring innovative software to life.',
    targetValue: 3,
    unit: 'phases',
    daysToAdd: 90,
    timeframeLabel: '3 months',
    color: '#6366f1',
    phases: [
      {
        id: 'ph_mvp_1',
        title: 'Phase 1: Validation & Architecture',
        description: 'Customer interviews, landing page signups, tech stack selection.',
        status: 'in_progress' as const,
        tasks: [
          { id: 'm_1', text: 'Build landing page with email waitlist', isCompleted: true },
          { id: 'm_2', text: 'Interview 10 potential target users', isCompleted: false },
        ],
      },
      {
        id: 'ph_mvp_2',
        title: 'Phase 2: Core MVP Build',
        description: 'Authentication, database, core value feature, Stripe billing.',
        status: 'not_started' as const,
        tasks: [
          { id: 'm_3', text: 'Implement core user flow and dashboard', isCompleted: false },
          { id: 'm_4', text: 'Integrate Stripe customer checkout', isCompleted: false },
        ],
      },
      {
        id: 'ph_mvp_3',
        title: 'Phase 3: Beta Launch & Marketing',
        description: 'Onboard first 25 users, launch on Product Hunt and communities.',
        status: 'not_started' as const,
        tasks: [
          { id: 'm_5', text: 'Launch to waitlist users and collect feedback', isCompleted: false },
          { id: 'm_6', text: 'Product Hunt & Twitter public announcement', isCompleted: false },
        ],
      },
    ],
    lists: [
      {
        id: 'list_ideas',
        title: 'Feature Ideas & Backlog',
        type: 'ideas' as const,
        items: [
          { id: 'id_1', text: 'One-click export to Notion or Markdown', isCompleted: false },
          { id: 'id_2', text: 'Weekly email digest for active users', isCompleted: false },
        ],
      },
    ],
  },
];

export function GoalEditorModal({
  isOpen,
  userId,
  initialGoal,
  templates = [],
  onClose,
  onSave,
  onDelete,
}: GoalEditorModalProps) {
  const today = getTodayDateString('Asia/Kolkata');

  // Core Goal Info
  const [domain, setDomain] = useState<GoalDomain>('personal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [motivation, setMotivation] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [trackingMode, setTrackingMode] = useState<GoalTrackingMode>('tasks');
  const [color, setColor] = useState('#3b82f6');
  const [status, setStatus] = useState<GoalStatus>('in_progress');

  // Dates
  const [targetDate, setTargetDate] = useState(addDays(today, 90));
  const [timeframeLabel, setTimeframeLabel] = useState('3 months');

  // Modular Elements: Phases
  const [phases, setPhases] = useState<GoalPhase[]>([]);
  const [newPhaseTitle, setNewPhaseTitle] = useState('');
  const [newPhaseDesc, setNewPhaseDesc] = useState('');
  const [newPhaseTaskText, setNewPhaseTaskText] = useState<Record<string, string>>({});

  // Modular Elements: Lists
  const [lists, setLists] = useState<GoalNamedList[]>([]);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListItemText, setNewListItemText] = useState<Record<string, string>>({});

  // Metric Fields (Optional)
  const [metricType, setMetricType] = useState<GoalMetricType>('numeric');
  const [targetValue, setTargetValue] = useState<string>('10');
  const [currentValue, setCurrentValue] = useState<string>('0');
  const [unit, setUnit] = useState('units');

  // Routines link
  const [linkedTemplateIds, setLinkedTemplateIds] = useState<string[]>([]);
  const [autoTrackFromActivities, setAutoTrackFromActivities] = useState(true);

  // Inspiration Drawer
  const [showInspiration, setShowInspiration] = useState(false);

  // Modular Elements: Milestones
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');

  // Active section tab in modal
  const [activeTab, setActiveTab] = useState<'basics' | 'tracking' | 'milestones' | 'phases' | 'lists' | 'routines'>('basics');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialGoal) {
      setDomain(initialGoal.domain || 'personal');
      setTitle(initialGoal.title || '');
      setDescription(initialGoal.description || '');
      setMotivation(initialGoal.motivation || '');
      setCategory(initialGoal.category || 'General');
      setPriority(initialGoal.priority || 'medium');
      setTrackingMode(initialGoal.trackingMode || 'tasks');
      setColor(initialGoal.color || '#3b82f6');
      setStatus(initialGoal.status || 'in_progress');
      setTargetDate(initialGoal.targetDate || addDays(today, 90));
      setTimeframeLabel(initialGoal.timeframeLabel || '3 months');

      // Phases
      setPhases(initialGoal.phases || []);

      // Lists: if empty, default to existing checklist
      if (initialGoal.lists && initialGoal.lists.length > 0) {
        setLists(initialGoal.lists);
      } else if (initialGoal.checklist && initialGoal.checklist.length > 0) {
        setLists([
          {
            id: 'list_primary',
            title: 'Action Items',
            type: 'checklist',
            items: initialGoal.checklist,
          },
        ]);
      } else {
        setLists([
          {
            id: 'list_primary',
            title: 'Action Items',
            type: 'checklist',
            items: [],
          },
        ]);
      }

      // Metrics
      setMetricType(initialGoal.metricType || 'numeric');
      setTargetValue(initialGoal.targetValue ? initialGoal.targetValue.toString() : '1');
      setCurrentValue(initialGoal.currentValue ? initialGoal.currentValue.toString() : '0');
      setUnit(initialGoal.unit || '');

      setLinkedTemplateIds(initialGoal.linkedTemplateIds || []);
      setMilestones(initialGoal.milestones || []);
      setAutoTrackFromActivities(initialGoal.autoTrackFromActivities ?? true);
      setShowInspiration(false);
    } else {
      // Clean canvas default
      setDomain('personal');
      setTitle('');
      setDescription('');
      setMotivation('');
      setCategory('General');
      setCustomCategoryInput('');
      setPriority('medium');
      setTrackingMode('tasks');
      setColor('#3b82f6');
      setStatus('in_progress');
      setTargetDate(addDays(today, 90));
      setTimeframeLabel('3 months');
      setPhases([]);
      setMilestones([]);
      setLists([
        {
          id: 'list_primary',
          title: 'Action Items',
          type: 'checklist',
          items: [],
        },
      ]);
      setMetricType('numeric');
      setTargetValue('10');
      setCurrentValue('0');
      setUnit('');
      setLinkedTemplateIds([]);
      setAutoTrackFromActivities(true);
      setShowInspiration(false);
      setActiveTab('basics');
    }
  }, [initialGoal, isOpen, today]);

  if (!isOpen) return null;

  function applyPreset(p: (typeof PRESET_TEMPLATES)[0]) {
    setDomain(p.domain);
    setTitle(p.title);
    setDescription(p.description);
    setMotivation(p.motivation);
    setCategory(p.category);
    setPriority(p.priority);
    setTrackingMode(p.trackingMode);
    setTargetDate(addDays(today, p.daysToAdd));
    setTimeframeLabel(p.timeframeLabel);
    setColor(p.color);
    setTargetValue(p.targetValue.toString());
    setCurrentValue('0');
    setUnit(p.unit);
    setPhases(p.phases);
    setLists(p.lists);
    setShowInspiration(false);
  }

  // --- Phase Handlers ---
  const handleAddPhase = () => {
    if (!newPhaseTitle.trim()) return;
    const newPhase: GoalPhase = {
      id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newPhaseTitle.trim(),
      description: newPhaseDesc.trim(),
      status: 'not_started',
      tasks: [],
    };
    setPhases([...phases, newPhase]);
    setNewPhaseTitle('');
    setNewPhaseDesc('');
  };

  const handleRemovePhase = (phaseId: string) => {
    setPhases(phases.filter((p) => p.id !== phaseId));
  };

  const handleAddPhaseTask = (phaseId: string) => {
    const text = (newPhaseTaskText[phaseId] || '').trim();
    if (!text) return;
    setPhases(
      phases.map((p) => {
        if (p.id === phaseId) {
          const newTask: GoalChecklistItem = {
            id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text,
            isCompleted: false,
          };
          return { ...p, tasks: [...(p.tasks || []), newTask] };
        }
        return p;
      })
    );
    setNewPhaseTaskText({ ...newPhaseTaskText, [phaseId]: '' });
  };

  const handleRemovePhaseTask = (phaseId: string, taskId: string) => {
    setPhases(
      phases.map((p) => {
        if (p.id === phaseId) {
          return { ...p, tasks: (p.tasks || []).filter((t) => t.id !== taskId) };
        }
        return p;
      })
    );
  };

  // --- List Handlers ---
  const handleAddNamedList = () => {
    if (!newListTitle.trim()) return;
    const newList: GoalNamedList = {
      id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newListTitle.trim(),
      type: 'checklist',
      items: [],
    };
    setLists([...lists, newList]);
    setNewListTitle('');
  };

  const handleRemoveNamedList = (listId: string) => {
    setLists(lists.filter((l) => l.id !== listId));
  };

  const handleAddListItem = (listId: string) => {
    const text = (newListItemText[listId] || '').trim();
    if (!text) return;
    setLists(
      lists.map((l) => {
        if (l.id === listId) {
          const newItem: GoalChecklistItem = {
            id: `li_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text,
            isCompleted: false,
          };
          return { ...l, items: [...(l.items || []), newItem] };
        }
        return l;
      })
    );
    setNewListItemText({ ...newListItemText, [listId]: '' });
  };

  const handleRemoveListItem = (listId: string, itemId: string) => {
    setLists(
      lists.map((l) => {
        if (l.id === listId) {
          return { ...l, items: (l.items || []).filter((i) => i.id !== itemId) };
        }
        return l;
      })
    );
  };

  // --- Milestone Handlers ---
  const handleAddMilestone = () => {
    const trimmedTitle = newMilestoneTitle.trim();
    if (!trimmedTitle) return;
    const newMs: GoalMilestone = {
      id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: trimmedTitle,
      description: newMilestoneDesc.trim() || undefined,
      targetDate: newMilestoneDate || undefined,
      isCompleted: false,
    };
    setMilestones([...milestones, newMs]);
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setNewMilestoneDesc('');
  };

  const handleRemoveMilestone = (msId: string) => {
    setMilestones(milestones.filter((m) => m.id !== msId));
  };

  const handleToggleMilestone = (msId: string) => {
    setMilestones(
      milestones.map((m) => {
        if (m.id === msId) {
          const nextDone = !m.isCompleted;
          return {
            ...m,
            isCompleted: nextDone,
            completedAt: nextDone ? Date.now() : undefined,
          };
        }
        return m;
      })
    );
  };

  const toggleLinkedTemplate = (templateId: string) => {
    setLinkedTemplateIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  const handleDeadlineShortcut = (days: number, label: string) => {
    setTargetDate(addDays(today, days));
    setTimeframeLabel(label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Determine final category
    const finalCategory = customCategoryInput.trim() || category;

    // Consolidate primary checklist for backward compat
    const primaryList = lists.find((l) => l.title.toLowerCase().includes('action')) || lists[0];
    const backwardChecklist = primaryList ? primaryList.items : [];

    // Calculate initial target and current based on tracking mode
    let parsedTarget = parseFloat(targetValue) || 1;
    let parsedCurrent = parseFloat(currentValue) || 0;

    if (trackingMode === 'phases') {
      const totalSteps = phases.reduce(
        (acc, p) => acc + (p.tasks && p.tasks.length > 0 ? p.tasks.length : 1),
        0
      );
      const completedSteps = phases.reduce((acc, p) => {
        if (p.tasks && p.tasks.length > 0) {
          return acc + p.tasks.filter((t) => t.isCompleted).length;
        }
        return acc + (p.status === 'completed' ? 1 : 0);
      }, 0);
      parsedTarget = totalSteps > 0 ? totalSteps : 1;
      parsedCurrent = completedSteps;
    } else if (trackingMode === 'milestones') {
      parsedTarget = milestones.length > 0 ? milestones.length : 1;
      parsedCurrent = milestones.filter((m) => m.isCompleted).length;
    } else if (trackingMode === 'tasks') {
      const allTasks = lists.flatMap((l) => l.items || []);
      if (allTasks.length > 0) {
        parsedTarget = allTasks.length;
        parsedCurrent = allTasks.filter((t) => t.isCompleted).length;
      }
    }

    setIsSubmitting(true);
    try {
      const goalToSave: LifeGoal = {
        id: initialGoal?.id || `life_goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        title: title.trim(),
        description: description.trim(),
        motivation: motivation.trim(),
        domain,
        category: finalCategory,
        priority,
        trackingMode,
        metricType,
        startValue: initialGoal?.startValue || 0,
        currentValue: parsedCurrent,
        targetValue: parsedTarget,
        unit: unit.trim(),
        phases,
        lists,
        experiences: initialGoal?.experiences || [],
        checklist: backwardChecklist,
        milestones,
        comments: initialGoal?.comments || [],
        items: initialGoal?.items || [],
        customFields: initialGoal?.customFields || [],
        links: initialGoal?.links || [],
        startDate: initialGoal?.startDate || today,
        targetDate,
        timeframeLabel: timeframeLabel.trim(),
        progressLogs: initialGoal?.progressLogs || [],
        linkedTemplateIds,
        autoTrackFromActivities,
        status,
        color,
        createdAt: initialGoal?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await onSave(goalToSave);
      onClose();
    } catch (err) {
      console.error('Failed to save life goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform"
              style={{ backgroundColor: `${color}25`, border: `1px solid ${color}60` }}
            >
              <Compass className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {initialGoal ? 'Edit Goal' : 'Define New Goal'}
              </h2>
              <p className="text-xs text-slate-400">
                Set up any personal, professional, or creative goal with custom phases, lists & priorities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Inspiration Drawer */}
        {!initialGoal && (
          <div className="px-6 pt-3 pb-2 border-b border-slate-800/80 bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowInspiration(!showInspiration)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium py-1 px-2.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showInspiration ? 'Hide sample templates' : 'Need inspiration? Browse sample templates'}</span>
              {showInspiration ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showInspiration && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 pb-2 animate-in slide-in-from-top-2 duration-200">
                {PRESET_TEMPLATES.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2.5 text-left rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/60 hover:bg-slate-800 transition-all group"
                  >
                    <div className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300">
                      {p.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{p.category} • {p.timeframeLabel}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('basics')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'basics'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Core Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tracking')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'tracking'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Tracking Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'milestones'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Milestone className="w-3.5 h-3.5" />
            <span>Milestones ({milestones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('phases')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'phases'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Phases & Roadmap ({phases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lists')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'lists'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Lists & Tasks ({lists.reduce((acc, l) => acc + l.items.length, 0)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routines')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'routines'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Daily Routines ({linkedTemplateIds.length})</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* TAB 1: CORE BASICS */}
          {activeTab === 'basics' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              {/* Domain & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Life Domain</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDomain('personal')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        domain === 'personal'
                          ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-sm'
                          : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>Personal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDomain('professional')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        domain === 'professional'
                          ? 'bg-blue-500/20 border-blue-500/60 text-blue-300 shadow-sm'
                          : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Professional</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Priority Level</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'critical', label: 'P0 Critical', color: 'rose' },
                        { id: 'high', label: 'P1 High', color: 'amber' },
                        { id: 'medium', label: 'P2 Medium', color: 'indigo' },
                        { id: 'low', label: 'P3 Low', color: 'slate' },
                      ] as const
                    ).map((p) => {
                      const isSelected = priority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id)}
                          className={`py-2 px-1 rounded-xl text-[11px] font-semibold text-center border transition-all ${
                            isSelected
                              ? p.id === 'critical'
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500/40'
                                : p.id === 'high'
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                                : p.id === 'medium'
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40'
                                : 'bg-slate-700 border-slate-500 text-slate-200 ring-1 ring-slate-400/40'
                              : 'bg-slate-800/70 border-slate-700/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Goal Title */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Goal Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Conversational Spanish, Run First Marathon, Launch SaaS Product..."
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                />
              </div>

              {/* Why This Goal Matters (Motivation / Purpose) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Why This Goal Matters (Motivation & Purpose)</span>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </label>
                <textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  rows={2}
                  placeholder="What is your deep 'why'? How will your life or career change once this is achieved?"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Description / Summary */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Description & Scope</span>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Key deliverables, scope, boundary conditions, or success criteria..."
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Category & Custom Tags */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Category or Area</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SUGGESTED_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setCustomCategoryInput('');
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        category === cat && !customCategoryInput
                          ? 'bg-indigo-500/20 border-indigo-500/70 text-indigo-300 font-semibold'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Or type any custom category/tag..."
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3.5 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Deadline & Timeframe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Deadline</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      required
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Quick Timeframe</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDeadlineShortcut(30, '1 month')}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs transition-colors"
                    >
                      1 mo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeadlineShortcut(90, '3 months')}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs transition-colors"
                    >
                      3 mo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeadlineShortcut(180, '6 months')}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs transition-colors"
                    >
                      6 mo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeadlineShortcut(365, '1 year')}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs transition-colors"
                    >
                      1 yr
                    </button>
                  </div>
                </div>
              </div>

              {/* Color Tag */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Theme Color</label>
                <div className="flex gap-3">
                  {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRACKING MODE */}
          {activeTab === 'tracking' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Select How to Track Progress</h3>
                <p className="text-xs text-slate-400 mb-3">
                  Choose the tracking model that naturally fits this goal. You can change this at any time.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'tasks' as GoalTrackingMode,
                      icon: <ListTodo className="w-5 h-5 text-indigo-400" />,
                      title: 'Tasks & Checklist',
                      desc: 'Progress is calculated from completed tasks across your lists.',
                    },
                    {
                      id: 'milestones' as GoalTrackingMode,
                      icon: <Milestone className="w-5 h-5 text-amber-400" />,
                      title: 'Key Milestones & Steps',
                      desc: 'Progress advances forward as small milestones are completed step-by-step.',
                    },
                    {
                      id: 'phases' as GoalTrackingMode,
                      icon: <Layers className="w-5 h-5 text-purple-400" />,
                      title: 'Roadmap & Phases',
                      desc: 'Progress follows multi-stage phases (e.g. Phase 1, Phase 2, Launch).',
                    },
                    {
                      id: 'metric' as GoalTrackingMode,
                      icon: <Target className="w-5 h-5 text-emerald-400" />,
                      title: 'Target Metric (Numeric)',
                      desc: 'For goals with a specific number (e.g. 30 books, 5 kg, $10,000 savings).',
                    },
                    {
                      id: 'habits' as GoalTrackingMode,
                      icon: <Activity className="w-5 h-5 text-amber-400" />,
                      title: 'Routine & Habit Streaks',
                      desc: 'Tracked automatically based on your daily routine activity logs.',
                    },
                    {
                      id: 'journey' as GoalTrackingMode,
                      icon: <Compass className="w-5 h-5 text-cyan-400" />,
                      title: 'Open Journey / Journal',
                      desc: 'Qualitative aspiration tracked via reflections, experiences & milestones.',
                    },
                  ].map((mode) => {
                    const isSelected = trackingMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setTrackingMode(mode.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                          {mode.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            {mode.title}
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            {mode.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If Milestones Mode is chosen, show quick summary / hint */}
              {trackingMode === 'milestones' && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <Milestone className="w-4 h-4" />
                      <span>{milestones.length} Small Milestones Defined</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Target progress is calculated automatically ({milestones.filter((m) => m.isCompleted).length} / {milestones.length || 1} completed).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('milestones')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-medium border border-amber-500/30 transition whitespace-nowrap cursor-pointer"
                  >
                    Manage Milestones →
                  </button>
                </div>
              )}

              {/* If Metric Mode is chosen, show optional numeric target inputs */}
              {trackingMode === 'metric' && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 space-y-3">
                  <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    <span>Target Metric Configuration</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Target Value</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        placeholder="e.g. 30"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Current Progress</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        placeholder="e.g. 0"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Unit Label</label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="e.g. books, kg, hours, km"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: MILESTONES & STEPS */}
          {activeTab === 'milestones' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Small Milestones & Key Steps</h3>
                  <p className="text-xs text-slate-400">
                    Break down your ambition into tangible checkpoints that move you closer to the final goal.
                  </p>
                </div>
                <div className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                  {milestones.filter((m) => m.isCompleted).length} of {milestones.length} Completed
                </div>
              </div>

              {/* Add New Milestone Input Form */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add a Small Milestone</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestone();
                      }
                    }}
                    placeholder="Milestone title (e.g. Prototype complete)..."
                    className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    type="date"
                    value={newMilestoneDate}
                    onChange={(e) => setNewMilestoneDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMilestoneDesc}
                    onChange={(e) => setNewMilestoneDesc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestone();
                      }
                    }}
                    placeholder="Optional details or criteria..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* List of Defined Milestones */}
              <div className="space-y-2">
                {milestones.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
                    <Milestone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No milestones added yet</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                      Add small milestone targets above to mark progress as you conquer each step closer to your goal.
                    </p>
                  </div>
                ) : (
                  milestones.map((ms, idx) => (
                    <div
                      key={ms.id}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        ms.isCompleted
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={ms.isCompleted}
                          onChange={() => handleToggleMilestone(ms.id)}
                          className="mt-0.5 w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-400 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-semibold ${
                                ms.isCompleted ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {idx + 1}. {ms.title}
                            </span>
                            {ms.targetDate && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                <span>{ms.targetDate}</span>
                              </span>
                            )}
                            {ms.isCompleted && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                                Done ✓
                              </span>
                            )}
                          </div>
                          {ms.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                              {ms.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(ms.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                        title="Delete milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PHASES & ROADMAP */}
          {activeTab === 'phases' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Phases & Roadmap</h3>
                  <p className="text-xs text-slate-400">
                    Break down complex goals into sequential stages or phases.
                  </p>
                </div>
              </div>

              {/* Add New Phase Input */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add a New Phase</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newPhaseTitle}
                    onChange={(e) => setNewPhaseTitle(e.target.value)}
                    placeholder="e.g. Phase 1: Foundation & Market Research"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={newPhaseDesc}
                    onChange={(e) => setNewPhaseDesc(e.target.value)}
                    placeholder="Optional description / key focus..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPhase}
                  disabled={!newPhaseTitle.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  + Add Phase
                </button>
              </div>

              {/* List of Phases */}
              {phases.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-950/30 border border-dashed border-slate-800 text-slate-500 text-xs">
                  No phases created yet. Add a phase above to build a roadmap!
                </div>
              ) : (
                <div className="space-y-3">
                  {phases.map((ph, idx) => (
                    <div
                      key={ph.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            {ph.title}
                          </div>
                          {ph.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 ml-7">{ph.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhase(ph.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Phase Tasks */}
                      <div className="ml-7 space-y-1.5">
                        {ph.tasks?.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/80 border border-slate-800/80"
                          >
                            <span className="text-slate-300 text-[11px]">{task.text}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePhaseTask(ph.id, task.id)}
                              className="text-slate-500 hover:text-rose-400 ml-2"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {/* Add Phase Task Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newPhaseTaskText[ph.id] || ''}
                            onChange={(e) =>
                              setNewPhaseTaskText({ ...newPhaseTaskText, [ph.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddPhaseTask(ph.id);
                              }
                            }}
                            placeholder="Add a step for this phase..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddPhaseTask(ph.id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg transition-colors"
                          >
                            Add Step
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LISTS & TASKS */}
          {activeTab === 'lists' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Custom Lists & Tasks</h3>
                  <p className="text-xs text-slate-400">
                    Organize multiple lists (e.g. Action Items, Resources, Reading/Watch List, Ideas).
                  </p>
                </div>
              </div>

              {/* Add New List Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNamedList();
                    }
                  }}
                  placeholder="Create new list (e.g. Key Resources, Tools to Buy, Ideas)..."
                  className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddNamedList}
                  disabled={!newListTitle.trim()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl disabled:opacity-40 transition-colors"
                >
                  + Add List
                </button>
              </div>

              {/* Render Lists */}
              <div className="space-y-4">
                {lists.map((lst) => (
                  <div
                    key={lst.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <ListTodo className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{lst.title}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({lst.items.length} items)
                        </span>
                      </div>
                      {lists.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveNamedList(lst.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Items in this list */}
                    <div className="space-y-1.5">
                      {lst.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900 border border-slate-800"
                        >
                          <span className="text-slate-300 text-[11px]">{item.text}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveListItem(lst.id, item.id)}
                            className="text-slate-500 hover:text-rose-400 ml-2"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add Item to List */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newListItemText[lst.id] || ''}
                          onChange={(e) =>
                            setNewListItemText({ ...newListItemText, [lst.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddListItem(lst.id);
                            }
                          }}
                          placeholder={`Add item to ${lst.title}...`}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddListItem(lst.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ROUTINES LINK */}
          {activeTab === 'routines' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div>
                <h3 className="text-sm font-semibold text-white">Link to Daily Routine Activities</h3>
                <p className="text-xs text-slate-400">
                  When you complete any of these routine activities on your dashboard, it will automatically record an activity session and update your goal progress!
                </p>
              </div>

              {templates.length === 0 ? (
                <div className="p-5 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
                  No routine activity templates found. Create routine activities on your home dashboard to link them!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((tpl) => {
                    const isLinked = linkedTemplateIds.includes(tpl.id);
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => toggleLinkedTemplate(tpl.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isLinked
                            ? 'bg-indigo-600/15 border-indigo-500/70 text-indigo-300'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Activity className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-medium truncate">{tpl.title}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isLinked ? 'bg-indigo-500 border-indigo-400' : 'border-slate-700'
                          }`}
                        >
                          {isLinked && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {linkedTemplateIds.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Auto-increment progress</div>
                    <div className="text-[11px] text-slate-400">
                      Automatically add +1 to your progress each time a linked activity is completed.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoTrackFromActivities}
                    onChange={(e) => setAutoTrackFromActivities(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {initialGoal && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this goal?')) {
                    onDelete(initialGoal.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Goal</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: color }}
              >
                {isSubmitting ? 'Saving...' : initialGoal ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
