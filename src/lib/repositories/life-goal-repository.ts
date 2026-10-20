import {
  LifeGoal,
  GoalProgressLog,
  GoalStatus,
  GoalChecklistItem,
  GoalComment,
  GoalActivityRecord,
  GoalTrackedItem,
  GoalCustomField,
  GoalItemLink,
  GoalPhase,
  GoalNamedList,
  GoalExperienceEntry,
} from '@/types/goals';
import { getInitialLifeGoals } from '@/lib/seed-goals';
import { db, canSyncWithFirestore, cleanForFirestore } from '@/lib/firebase/config';
import { MutationQueue } from '@/lib/sync/mutation-queue';
import { SyncEngine } from '@/lib/sync/sync-engine';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'my_routine_life_goals_';

export class LifeGoalRepository {
  private static getLocalKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  static getLocalLifeGoals(userId: string): LifeGoal[] {
    if (typeof window === 'undefined') {
      return getInitialLifeGoals(userId);
    }
    const raw = localStorage.getItem(this.getLocalKey(userId));
    if (!raw) {
      const guestRaw =
        userId !== 'local-default-user'
          ? localStorage.getItem(this.getLocalKey('local-default-user'))
          : null;
      if (guestRaw) {
        try {
          const guestGoals = (JSON.parse(guestRaw) as LifeGoal[]).map((g) => ({
            ...g,
            userId,
          }));
          this.saveLocalLifeGoals(userId, guestGoals);
          return guestGoals;
        } catch {
          // ignore fallback
        }
      }
      const initial = getInitialLifeGoals(userId);
      this.saveLocalLifeGoals(userId, initial);
      return initial;
    }
    try {
      return JSON.parse(raw) as LifeGoal[];
    } catch {
      return getInitialLifeGoals(userId);
    }
  }

  static saveLocalLifeGoals(userId: string, goals: LifeGoal[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getLocalKey(userId), JSON.stringify(goals));
  }

  static recalculateGoalProgress(goal: LifeGoal): LifeGoal {
    const trackingMode = goal.trackingMode || 'tasks';
    let currentValue = goal.currentValue;
    let targetValue = goal.targetValue;

    if (trackingMode === 'phases') {
      const phases = goal.phases || [];
      if (phases.length > 0) {
        targetValue = phases.length;
        currentValue = phases.filter((p) => p.status === 'completed').length;
      }
    } else if (trackingMode === 'tasks') {
      const directChecklist = goal.checklist || [];
      const listTasks = (goal.lists || []).flatMap((l) => l.items || []);
      const allTasks = [...directChecklist, ...listTasks];
      if (allTasks.length > 0) {
        targetValue = allTasks.length;
        currentValue = allTasks.filter((t) => t.isCompleted).length;
      }
    } else if (trackingMode === 'habits') {
      const activities = goal.activityRecords || [];
      currentValue = activities.length;
    }

    const isCompleted = targetValue > 0 && currentValue >= targetValue;
    const status: GoalStatus = isCompleted
      ? 'completed'
      : goal.status === 'completed' && currentValue < targetValue
      ? 'in_progress'
      : goal.status;

    return {
      ...goal,
      currentValue,
      targetValue,
      status,
    };
  }

  static async saveGoal(goal: LifeGoal): Promise<LifeGoal> {
    const userId = goal.userId;
    const all = this.getLocalLifeGoals(userId);
    const idx = all.findIndex((g) => g.id === goal.id);

    const normalizedGoal: LifeGoal = {
      ...goal,
      phases: goal.phases || [],
      lists: goal.lists || [],
      experiences: goal.experiences || [],
      priority: goal.priority || 'medium',
      trackingMode: goal.trackingMode || 'tasks',
      checklist: goal.checklist || [],
      comments: goal.comments || [],
      updatedAt: Date.now(),
    };

    const updatedGoal = this.recalculateGoalProgress(normalizedGoal);

    let next: LifeGoal[];
    if (idx >= 0) {
      next = [...all];
      next[idx] = updatedGoal;
    } else {
      next = [...all, updatedGoal];
    }

    this.saveLocalLifeGoals(userId, next);
    MutationQueue.enqueue(userId, 'life_goals', 'set', goal.id, updatedGoal);
    SyncEngine.notifyListeners(userId);

    if (canSyncWithFirestore(userId)) {
      setDoc(
        doc(db, `users/${userId}/life_goals`, goal.id),
        cleanForFirestore(updatedGoal)
      ).catch((err) => {
        console.warn('Failed to sync life goal to Firestore:', err);
      });
    }

    return updatedGoal;
  }

  static async logProgress(
    userId: string,
    goalId: string,
    valueChange: number,
    note: string = '',
    date: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newCurrent = Math.max(0, Number((existing.currentValue + valueChange).toFixed(2)));
    const isNowCompleted = newCurrent >= existing.targetValue;

    const newLog: GoalProgressLog = {
      id: `prog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date,
      valueChange,
      currentValue: newCurrent,
      note: note.trim(),
      createdAt: Date.now(),
    };

    const updatedGoal: LifeGoal = {
      ...existing,
      currentValue: newCurrent,
      status: isNowCompleted ? 'completed' : existing.status === 'completed' && newCurrent < existing.targetValue ? 'in_progress' : existing.status,
      progressLogs: [newLog, ...(existing.progressLogs || [])],
      updatedAt: Date.now(),
    };

    await this.saveGoal(updatedGoal);
    return updatedGoal;
  }

  static async toggleMilestone(
    userId: string,
    goalId: string,
    milestoneId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedMilestones = (existing.milestones || []).map((m) => {
      if (m.id === milestoneId) {
        const nextDone = !m.isCompleted;
        return {
          ...m,
          isCompleted: nextDone,
          completedAt: nextDone ? Date.now() : undefined,
        };
      }
      return m;
    });

    const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
    const isAllDone = updatedMilestones.length > 0 && completedCount === updatedMilestones.length;

    const updatedGoal: LifeGoal = {
      ...existing,
      milestones: updatedMilestones,
      currentValue: completedCount,
      targetValue: updatedMilestones.length || existing.targetValue,
      status: isAllDone ? 'completed' : completedCount < updatedMilestones.length && existing.status === 'completed' ? 'in_progress' : existing.status,
      updatedAt: Date.now(),
    };

    await this.saveGoal(updatedGoal);
    return updatedGoal;
  }

  static async updateGoalStatus(
    userId: string,
    goalId: string,
    status: GoalStatus
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedGoal: LifeGoal = {
      ...existing,
      status,
      updatedAt: Date.now(),
    };

    await this.saveGoal(updatedGoal);
    return updatedGoal;
  }

  // --- Goal Action Checklist ---
  static async addChecklistItem(
    userId: string,
    goalId: string,
    text: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newItem: GoalChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      isCompleted: false,
    };

    const updatedChecklist = [...(existing.checklist || []), newItem];
    const updatedGoal: LifeGoal = {
      ...existing,
      checklist: updatedChecklist,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async toggleChecklistItem(
    userId: string,
    goalId: string,
    itemId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedChecklist = (existing.checklist || []).map((item) => {
      if (item.id === itemId) {
        const nextDone = !item.isCompleted;
        return {
          ...item,
          isCompleted: nextDone,
          completedAt: nextDone ? Date.now() : undefined,
        };
      }
      return item;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      checklist: updatedChecklist,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deleteChecklistItem(
    userId: string,
    goalId: string,
    itemId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedChecklist = (existing.checklist || []).filter((item) => item.id !== itemId);
    const updatedGoal: LifeGoal = {
      ...existing,
      checklist: updatedChecklist,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  // --- Structured Phases & Roadmap ---
  static async addPhase(
    userId: string,
    goalId: string,
    phaseData: Omit<GoalPhase, 'id'>
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newPhase: GoalPhase = {
      ...phaseData,
      id: `phase_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tasks: phaseData.tasks || [],
    };

    const updatedPhases = [...(existing.phases || []), newPhase];
    const updatedGoal: LifeGoal = {
      ...existing,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async updatePhase(
    userId: string,
    goalId: string,
    phaseId: string,
    updates: Partial<Omit<GoalPhase, 'id'>>
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedPhases: GoalPhase[] = (existing.phases || []).map((p) => {
      if (p.id === phaseId) {
        const nextStatus: GoalPhase['status'] = updates.status !== undefined ? updates.status : p.status;
        return {
          ...p,
          ...updates,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? (p.completedAt || Date.now()) : undefined,
        };
      }
      return p;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async togglePhaseStatus(
    userId: string,
    goalId: string,
    phaseId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedPhases: GoalPhase[] = (existing.phases || []).map((p) => {
      if (p.id === phaseId) {
        const nextStatus: GoalPhase['status'] = p.status === 'completed' ? 'in_progress' : 'completed';
        return {
          ...p,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? Date.now() : undefined,
        };
      }
      return p;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deletePhase(
    userId: string,
    goalId: string,
    phaseId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedPhases = (existing.phases || []).filter((p) => p.id !== phaseId);
    const updatedGoal: LifeGoal = {
      ...existing,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async addPhaseTask(
    userId: string,
    goalId: string,
    phaseId: string,
    text: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newTask: GoalChecklistItem = {
      id: `ptask_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      isCompleted: false,
    };

    const updatedPhases = (existing.phases || []).map((p) => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: [...(p.tasks || []), newTask],
        };
      }
      return p;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async togglePhaseTask(
    userId: string,
    goalId: string,
    phaseId: string,
    taskId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedPhases = (existing.phases || []).map((p) => {
      if (p.id === phaseId) {
        const nextTasks = (p.tasks || []).map((t) => {
          if (t.id === taskId) {
            const nextDone = !t.isCompleted;
            return {
              ...t,
              isCompleted: nextDone,
              completedAt: nextDone ? Date.now() : undefined,
            };
          }
          return t;
        });
        return {
          ...p,
          tasks: nextTasks,
        };
      }
      return p;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deletePhaseTask(
    userId: string,
    goalId: string,
    phaseId: string,
    taskId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedPhases = (existing.phases || []).map((p) => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: (p.tasks || []).filter((t) => t.id !== taskId),
        };
      }
      return p;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  // --- Multiple Categorized Lists ---
  static async addNamedList(
    userId: string,
    goalId: string,
    title: string,
    type: 'checklist' | 'resources' | 'ideas' | 'reading' | 'custom' = 'checklist'
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newList: GoalNamedList = {
      id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      type,
      items: [],
    };

    const updatedLists = [...(existing.lists || []), newList];
    const updatedGoal: LifeGoal = {
      ...existing,
      lists: updatedLists,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deleteNamedList(
    userId: string,
    goalId: string,
    listId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedLists = (existing.lists || []).filter((l) => l.id !== listId);
    const updatedGoal: LifeGoal = {
      ...existing,
      lists: updatedLists,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async addListItem(
    userId: string,
    goalId: string,
    listId: string,
    text: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newItem: GoalChecklistItem = {
      id: `litem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      isCompleted: false,
    };

    const updatedLists = (existing.lists || []).map((l) => {
      if (l.id === listId) {
        return {
          ...l,
          items: [...(l.items || []), newItem],
        };
      }
      return l;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      lists: updatedLists,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async toggleListItem(
    userId: string,
    goalId: string,
    listId: string,
    itemId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedLists = (existing.lists || []).map((l) => {
      if (l.id === listId) {
        const nextItems = (l.items || []).map((item) => {
          if (item.id === itemId) {
            const nextDone = !item.isCompleted;
            return {
              ...item,
              isCompleted: nextDone,
              completedAt: nextDone ? Date.now() : undefined,
            };
          }
          return item;
        });
        return {
          ...l,
          items: nextItems,
        };
      }
      return l;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      lists: updatedLists,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deleteListItem(
    userId: string,
    goalId: string,
    listId: string,
    itemId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedLists = (existing.lists || []).map((l) => {
      if (l.id === listId) {
        return {
          ...l,
          items: (l.items || []).filter((item) => item.id !== itemId),
        };
      }
      return l;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      lists: updatedLists,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  // --- Experience & Reflection Journal ---
  static async addExperienceEntry(
    userId: string,
    goalId: string,
    entryData: Omit<GoalExperienceEntry, 'id' | 'createdAt'>
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newEntry: GoalExperienceEntry = {
      ...entryData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    const updatedEntries = [newEntry, ...(existing.experiences || [])];
    const updatedGoal: LifeGoal = {
      ...existing,
      experiences: updatedEntries,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async updateExperienceEntry(
    userId: string,
    goalId: string,
    entryId: string,
    updates: Partial<Omit<GoalExperienceEntry, 'id' | 'createdAt'>>
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedEntries = (existing.experiences || []).map((e) =>
      e.id === entryId ? { ...e, ...updates, updatedAt: Date.now() } : e
    );

    const updatedGoal: LifeGoal = {
      ...existing,
      experiences: updatedEntries,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deleteExperienceEntry(
    userId: string,
    goalId: string,
    entryId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedEntries = (existing.experiences || []).filter((e) => e.id !== entryId);
    const updatedGoal: LifeGoal = {
      ...existing,
      experiences: updatedEntries,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  // --- Goal Comments & Notes ---
  static async addGoalComment(
    userId: string,
    goalId: string,
    text: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newComment: GoalComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      createdAt: Date.now(),
    };

    const updatedComments = [...(existing.comments || []), newComment];
    const updatedGoal: LifeGoal = {
      ...existing,
      comments: updatedComments,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async updateGoalComment(
    userId: string,
    goalId: string,
    commentId: string,
    text: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedComments = (existing.comments || []).map((c) =>
      c.id === commentId ? { ...c, text: text.trim(), updatedAt: Date.now() } : c
    );

    const updatedGoal: LifeGoal = {
      ...existing,
      comments: updatedComments,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deleteGoalComment(
    userId: string,
    goalId: string,
    commentId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedComments = (existing.comments || []).filter((c) => c.id !== commentId);
    const updatedGoal: LifeGoal = {
      ...existing,
      comments: updatedComments,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  // --- Detailed Tracked Items (Books, Courses, Projects) ---
  static async addTrackedItem(
    userId: string,
    goalId: string,
    itemData: Omit<GoalTrackedItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newItem: GoalTrackedItem = {
      ...itemData,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedItems = [...(existing.items || []), newItem];
    const updatedGoal: LifeGoal = {
      ...existing,
      items: updatedItems,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async updateTrackedItem(
    userId: string,
    goalId: string,
    itemId: string,
    updates: Partial<Omit<GoalTrackedItem, 'id' | 'createdAt'>>
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedItems = (existing.items || []).map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          ...updates,
          updatedAt: Date.now(),
        };
      }
      return item;
    });

    const updatedGoal: LifeGoal = {
      ...existing,
      items: updatedItems,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deleteTrackedItem(
    userId: string,
    goalId: string,
    itemId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedItems = (existing.items || []).filter((item) => item.id !== itemId);
    const updatedGoal: LifeGoal = {
      ...existing,
      items: updatedItems,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async updateItemProgress(
    userId: string,
    goalId: string,
    itemId: string,
    currentUnits: number,
    markCompleted?: boolean
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    let targetItemCompletedNow = false;

    const updatedItems = (existing.items || []).map((item) => {
      if (item.id === itemId) {
        const isDone =
          markCompleted !== undefined
            ? markCompleted
            : item.totalUnits > 0 && currentUnits >= item.totalUnits;

        if (isDone && item.status !== 'completed') {
          targetItemCompletedNow = true;
        }

        return {
          ...item,
          currentUnits,
          status: isDone ? ('completed' as const) : ('in_progress' as const),
          completedAt: isDone ? (item.completedAt || Date.now()) : undefined,
          updatedAt: Date.now(),
        };
      }
      return item;
    });

    let newCurrent = existing.currentValue;
    if (targetItemCompletedNow && existing.metricType === 'numeric') {
      newCurrent = Math.min(existing.targetValue, existing.currentValue + 1);
    }

    const updatedGoal: LifeGoal = {
      ...existing,
      currentValue: newCurrent,
      items: updatedItems,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  // --- Flexible Custom Fields ---
  static async addGoalCustomField(
    userId: string,
    goalId: string,
    labelOrField: string | { label: string; value: string },
    valueStr?: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const label = typeof labelOrField === 'string' ? labelOrField : labelOrField.label;
    const value = typeof labelOrField === 'string' ? valueStr || '' : labelOrField.value;

    const newField: GoalCustomField = {
      id: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: label.trim(),
      value: value.trim(),
    };

    const updatedFields = [...(existing.customFields || []), newField];
    const updatedGoal: LifeGoal = {
      ...existing,
      customFields: updatedFields,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deleteGoalCustomField(
    userId: string,
    goalId: string,
    fieldId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedFields = (existing.customFields || []).filter((f) => f.id !== fieldId);
    const updatedGoal: LifeGoal = {
      ...existing,
      customFields: updatedFields,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  // --- Flexible Links & Local File Paths ---
  static async addGoalLink(
    userId: string,
    goalId: string,
    link: Omit<GoalItemLink, 'id'>
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newLink: GoalItemLink = {
      ...link,
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: link.title.trim(),
      urlOrPath: link.urlOrPath.trim(),
    };

    const updatedLinks = [...(existing.links || []), newLink];
    const updatedGoal: LifeGoal = {
      ...existing,
      links: updatedLinks,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async deleteGoalLink(
    userId: string,
    goalId: string,
    linkId: string
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const updatedLinks = (existing.links || []).filter((l) => l.id !== linkId);
    const updatedGoal: LifeGoal = {
      ...existing,
      links: updatedLinks,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  // --- Daily Activity History & Tracking ---
  static async recordActivityForGoal(
    userId: string,
    goalId: string,
    data: {
      date: string;
      activityTitle: string;
      durationMinutes?: number;
      notes?: string;
      templateId?: string;
      incrementProgress?: boolean;
    }
  ): Promise<LifeGoal | null> {
    const all = this.getLocalLifeGoals(userId);
    const existing = all.find((g) => g.id === goalId);
    if (!existing) return null;

    const newRecord: GoalActivityRecord = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: data.date,
      activityTitle: data.activityTitle,
      templateId: data.templateId,
      durationMinutes: data.durationMinutes || 0,
      notes: data.notes || '',
      completedAt: Date.now(),
    };

    const currentRecords = existing.activityRecords || [];
    const updatedRecords = [newRecord, ...currentRecords];

    let newCurrent = existing.currentValue;
    if (data.incrementProgress) {
      newCurrent = Math.max(0, Number((existing.currentValue + 1).toFixed(2)));
    }

    const isNowCompleted = newCurrent >= existing.targetValue;

    const updatedGoal: LifeGoal = {
      ...existing,
      currentValue: newCurrent,
      status: isNowCompleted ? 'completed' : existing.status,
      activityRecords: updatedRecords,
      updatedAt: Date.now(),
    };

    return await this.saveGoal(updatedGoal);
  }

  static async syncCompletedRoutineToLifeGoals(
    userId: string,
    date: string,
    templateId: string,
    templateTitle: string,
    durationMinutes: number = 0,
    notes: string = ''
  ): Promise<LifeGoal[]> {
    const all = this.getLocalLifeGoals(userId);
    const matchingGoals = all.filter((g) => g.linkedTemplateIds?.includes(templateId));
    if (matchingGoals.length === 0) return [];

    const updatedGoals: LifeGoal[] = [];
    for (const g of matchingGoals) {
      const updated = await this.recordActivityForGoal(userId, g.id, {
        date,
        activityTitle: templateTitle,
        durationMinutes,
        notes,
        templateId,
        incrementProgress: Boolean(g.autoTrackFromActivities),
      });
      if (updated) updatedGoals.push(updated);
    }
    return updatedGoals;
  }

  static async deleteGoal(userId: string, goalId: string): Promise<void> {
    const all = this.getLocalLifeGoals(userId);
    const next = all.filter((g) => g.id !== goalId);
    this.saveLocalLifeGoals(userId, next);

    MutationQueue.enqueue(userId, 'life_goals', 'delete', goalId);
    SyncEngine.notifyListeners(userId);

    if (canSyncWithFirestore(userId)) {
      deleteDoc(doc(db, `users/${userId}/life_goals`, goalId)).catch((err) => {
        console.warn('Failed to delete life goal from Firestore:', err);
      });
    }
  }

  static subscribeLifeGoals(
    userId: string,
    onData: (goals: LifeGoal[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const local = this.getLocalLifeGoals(userId);
    onData(local);

    if (!canSyncWithFirestore(userId)) {
      return () => {};
    }

    try {
      const colRef = collection(db, `users/${userId}/life_goals`);
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const remote: LifeGoal[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as LifeGoal;
              if (data.status !== 'archived') {
                remote.push(data);
              }
            });
            this.saveLocalLifeGoals(userId, remote);
            onData(remote);
          } else if (local.length > 0) {
            for (const g of local) {
              setDoc(doc(db, `users/${userId}/life_goals`, g.id), cleanForFirestore(g)).catch(
                console.warn
              );
            }
          } else {
            this.saveLocalLifeGoals(userId, []);
            onData([]);
          }
        },
        (err) => {
          console.warn('Realtime life goal listener error:', err);
          if (onError) onError(err);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Failed to attach realtime life goal listener:', err);
      if (onError) onError(err);
      return () => {};
    }
  }
}
