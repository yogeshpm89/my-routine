# Investigation: Life Goals Small Milestones & Phase Step-Level Progress Tracking

## 1. Problem Space & Architectural Analysis

### 1.1 Existing Tracking Modes & The Attachment Comparison

The application provides a "Select How to Track Progress" selector (`GoalEditorModal.tsx` lines 966–1035) with the following options:
1. `tasks` (Tasks & Checklist): Progress is calculated from completed tasks across your lists.
2. `phases` (Roadmap & Phases): Progress follows multi-stage phases (e.g. Phase 1, Phase 2, Launch).
3. `metric` (Target Metric): For goals with a specific numeric target (e.g. 30 books, 5 kg).
4. `habits` (Routine & Habit Streaks): Tracked automatically based on daily routine activity logs.
5. `journey` (Open Journey / Journal): Qualitative aspiration tracked via reflections.
6. `items` (Detailed Tracked Items): Tracked books, courses, projects (recently added in Feature-009).

### 1.2 The Gap in Roadmap & Phases

In `LifeGoalRepository.recalculateGoalProgress`:
```ts
if (trackingMode === 'phases') {
  const phases = goal.phases || [];
  if (phases.length > 0) {
    targetValue = phases.length;
    currentValue = phases.filter((p) => p.status === 'completed').length;
  }
}
```
And in `GoalEditorModal.tsx`:
```ts
if (trackingMode === 'phases') {
  parsedTarget = phases.length > 0 ? phases.length : 1;
  parsedCurrent = phases.filter((p) => p.status === 'completed').length;
}
```
**Observation**:
- Each phase contains `tasks: GoalChecklistItem[]` (e.g. `[ { id: 't_1', text: 'Study Transformer Architecture paper', isCompleted: true }, ... ]`).
- In the UI (`goals-dashboard.tsx` lines 946-1025), these are presented as **steps in phase** (`placeholder="Add step to this phase..."`).
- However, when a user completes a step in a phase, `currentValue` does not change! It only increments when the *entire phase* is toggled as completed.
- This creates psychological friction for users tackling multi-week phases where dozens of hours of work yield zero apparent progress on the goal dashboard.

**Solution**:
- When `trackingMode === 'phases'`, tracking must measure completed steps across all phases:
  - `totalSteps`: Sum of `phase.tasks.length` across phases. If a phase has no sub-tasks yet, it counts as 1 deliverable unit.
  - `completedSteps`: Sum of `phase.tasks.filter(t => t.isCompleted).length`. For a phase with no sub-tasks, it contributes 1 if `phase.status === 'completed'`, else 0.
  - Target value is `totalSteps`, and current value is `completedSteps`.
  - When all steps within a phase are completed, `phase.status` automatically updates to `'completed'`. If a step is unchecked, `phase.status` reverts to `'in_progress'`.

### 1.3 The Gap in Small Milestones

In `src/types/goals.ts`:
- `GoalMilestoneSchema` defines `{ id, title, isCompleted, completedAt }`.
- `LifeGoal` has `milestones?: GoalMilestone[]`.
- `LifeGoalRepository` has a basic `toggleMilestone(userId, goalId, milestoneId)` implementation that recalculates `currentValue = completedCount`.
- In `src/app/page.tsx`, `handleToggleGoalMilestone` is wired up.
- **BUT**:
  - `GoalTrackingModeSchema` does not include `'milestones'`.
  - "Select How to Track Progress" in `GoalEditorModal` has no option for Milestones.
  - `GoalEditorModal` has no Milestones tab or inputs to add or edit milestones. It simply passes `initialGoal?.milestones || []`.
  - `GoalsDashboard` does not render a Milestones tab on the goal card, even though `onToggleMilestone` is defined as a prop.
  - There are no repository methods to `addMilestone`, `deleteMilestone`, or `updateMilestone`.

**Solution**:
1. Add `'milestones'` to `GoalTrackingModeSchema`.
2. Add the **Key Milestones & Steps** card to the "Select How to Track Progress" grid with icon, title, and description.
3. Add a **Milestones** tab to `GoalEditorModal` to add, view, toggle, and delete milestones with optional target dates and descriptions.
4. Add a dedicated **Milestones** tab to `GoalsDashboard` goal cards featuring:
   - Checkboxes with completed timestamps.
   - Target date chips.
   - Deletion action.
   - Inline "Add small milestone..." input for fast, 1-tap additions.
5. Add `addMilestone`, `deleteMilestone`, and `updateMilestone` to `LifeGoalRepository`.
6. Support `trackingMode === 'milestones'` in `recalculateGoalProgress`:
   `targetValue = milestones.length; currentValue = milestones.filter(m => m.isCompleted).length;`

---

## 2. Detailed Technical Design

### 2.1 Progress Calculation Logic

```ts
static recalculateGoalProgress(goal: LifeGoal): LifeGoal {
  const trackingMode = goal.trackingMode || 'tasks';
  let currentValue = goal.currentValue;
  let targetValue = goal.targetValue;

  if (trackingMode === 'phases') {
    const phases = goal.phases || [];
    if (phases.length > 0) {
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
      targetValue = totalSteps > 0 ? totalSteps : 1;
      currentValue = completedSteps;
    }
  } else if (trackingMode === 'milestones' || goal.metricType === 'milestone') {
    const milestones = goal.milestones || [];
    if (milestones.length > 0) {
      targetValue = milestones.length;
      currentValue = milestones.filter((m) => m.isCompleted).length;
    }
  } else if (trackingMode === 'tasks') {
    const directChecklist = goal.checklist || [];
    const listTasks = (goal.lists || []).flatMap((l) => l.items || []);
    const allTasks = [...directChecklist, ...listTasks];
    if (allTasks.length > 0) {
      targetValue = allTasks.length;
      currentValue = allTasks.filter((t) => t.isCompleted).length;
    }
  } else if (trackingMode === 'items') {
    const items = goal.items || [];
    if (items.length > 0) {
      targetValue = items.length;
      currentValue = items.filter((i) => i.status === 'completed').length;
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
```

### 2.2 Phase Step Automation

In `togglePhaseTask`:
```ts
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

    // Auto-update phase status if all tasks are complete
    const allDone = nextTasks.length > 0 && nextTasks.every((t) => t.isCompleted);
    const anyDone = nextTasks.some((t) => t.isCompleted);
    const nextStatus: GoalPhase['status'] = allDone
      ? 'completed'
      : anyDone
      ? 'in_progress'
      : 'not_started';

    return {
      ...p,
      tasks: nextTasks,
      status: nextStatus,
      completedAt: allDone ? Date.now() : undefined,
    };
  }
  return p;
});
```

---

## 3. Risks & Mitigations

1. **Risk**: Existing goals with `trackingMode === 'phases'` where users have partially checked tasks might see their overall goal progress change.
   - **Mitigation**: This is exactly what the user requested ("for phases and roadmap the tracking should be done at step in phase"). If all tasks were completed, the phase remains completed (100%).
2. **Risk**: Empty phases without tasks could cause division by zero.
   - **Mitigation**: Any phase with zero tasks defaults to contributing `1` unit to `totalSteps` and `1` to `completedSteps` if the phase status is `completed`, ensuring full mathematical stability.
3. **Risk**: Backward compatibility with LocalStorage and Firestore.
   - **Mitigation**: `GoalMilestone` fields (`description`, `targetDate`) and `GoalTrackingMode` (`'milestones'`) are strictly additive. No existing fields are renamed or removed.
