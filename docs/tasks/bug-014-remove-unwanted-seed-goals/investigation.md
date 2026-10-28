# Bug-014: Technical Investigation — Unwanted Seed Goals & Oversized Goal Cards

## 1. Overview & Context

This investigation examines two related issues reported by the user:
1. **GitHub Issue #14**: Unwanted goals popping up in the user's Life Goals view (*"Read 30 books in 1 year"*, *"Lose 5 kg weight in 3 months"*, *"Complete Generative AI course in next 1-2 months"*).
2. **User Card Layout Feedback**: Life goal cards are very tall and unwieldy (*"the goal card is very big, can we collapse the sections on lifes goal card"*). The user provided a screenshot of a 13-phase roadmap with 297 total steps where every phase's chapter checkboxes are rendered expanded simultaneously.

---

## 2. Codebase Architecture & Tracing

### 2.1 Where Seed Goals are Defined
In [`src/lib/seed-goals.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts):
```typescript
export function getInitialLifeGoals(userId: string): LifeGoal[] {
  const today = getTodayDateString('Asia/Kolkata');
  const now = Date.now();

  return [
    {
      id: 'life_goal_read_30_books',
      userId,
      title: 'Read 30 books in 1 year',
      ...
    },
    {
      id: 'life_goal_genai_course',
      userId,
      title: 'Complete Generative AI course in next 1-2 months',
      ...
    },
    {
      id: 'life_goal_lose_5kg',
      userId,
      title: 'Lose 5 kg weight in 3 months',
      ...
    }
  ];
}
```
These three goals were originally written as sample demonstration records during Feature-009.

### 2.2 How Seed Goals are Injected into Local Storage & Cloud Firestore
1. In [`LifeGoalRepository.getLocalLifeGoals(userId)`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts#L37-L68), whenever `localStorage` has no record for the user, it saves and returns `getInitialLifeGoals(userId)`.
2. When `LifeGoalRepository.getLifeGoals(userId)` or `subscribeLifeGoals` runs, if the remote collection `users/${userId}/life_goals` is empty, it writes each local goal to Firestore via `setDoc`.
3. Once in Firestore, the documents are synchronized down to all devices and persist across cache clears.

### 2.3 Why Goal Cards are Oversized (Investigation of `goals-dashboard.tsx`)
In [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx#L938-L1080):
1. **Unconditional Phase Steps Expansion**:
   Inside the Roadmap tab (`activeTab === 'phases'`), `phases.map((ph, idx) => ...)` iterates over every phase. For every phase, it renders:
   - Phase title, step count badge, progress bar, and "Mark Complete" button.
   - An unconstrained `<div className="ml-7 mt-2 space-y-1">` that renders **all** `ph.tasks` without any accordion collapse toggle!
   - In the user's real-world reading goal, Phase 1 ("Awaken the Giant Within — Tony Robbins") alone has 26 steps. With 13 phases, that equals 297 checkboxes rendered all at once on a single card!
2. **No Card Minimization**:
   The goal card always displays all details: Header row, Title & description, Motivation quote box, Progress bar, Sub-navigation tabs, and the entire Active Tab content. There is no control to minimize the card to a summary view.
3. **No Bulk Toggle**:
   There is no "Expand All / Collapse All" button at the top of the Roadmap stages container.

---

## 3. Scope of Affected Files & Components

| File Path | Role in Issue | Required Change |
|---|---|---|
| [`src/lib/seed-goals.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts) | Returns 3 mock goals | Change `getInitialLifeGoals(userId)` to return `[]`. Export `getSampleLifeGoals(userId)` for test fixtures. |
| [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts) | Storage & Firestore sync | 1. Return `[]` on empty storage.<br>2. Add `purgeLegacySeedGoals(userId)` to delete seed IDs from storage & Firestore.<br>3. Filter out legacy seed IDs from remote sync. |
| [`src/lib/sync/backup-service.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sync/backup-service.ts) | `resetToDefaultRoutine` resets goals | Set life goals to `[]` when resetting default routine. |
| [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx) | Renders goal cards and roadmap phases | 1. Add `collapsedCards` state and card header minimize toggle button.<br>2. Add `collapsedPhases` state and accordion toggle to phase headers.<br>3. Add "Expand All / Collapse All" toggle in Roadmap header.<br>4. Auto-collapse completed phases by default. |
| [`src/lib/repositories/life-goals.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goals.test.ts) | Repository unit tests | Point fixtures to `getSampleLifeGoals`, add tests for empty initial state and purge. |

---

## 4. UI Design for Collapsible Sections

### 4.1 Card-Level Collapse (Compact Summary Mode)
In the goal card header, next to Edit and Delete:
- Add a collapse toggle button (`ChevronUp` when expanded, `ChevronDown` when collapsed).
- When collapsed:
  - Header badges (Priority, Domain, Mode, Category) remain visible.
  - Action buttons (Edit, Delete, Expand) remain accessible.
  - Title & description remain visible.
  - Progress bar and countdown remain visible.
  - Motivation quote, sub-navigation tabs, and active tab content are hidden.
  - The card height shrinks from > 1,500px down to ~120px!

### 4.2 Phase-Level Accordion in Roadmap
- Each phase header becomes clickable and displays a `ChevronDown` (when open) or `ChevronRight` (when closed).
- When collapsed, the phase displays its status, title, step count badge (e.g. `0/26 steps (0%)`), progress bar, and "Mark Complete" button in a compact bar.
- When expanded, it reveals the individual step checkboxes and the quick-add step input.
- **Smart Default**:
  - `ph.status === 'completed'` defaults to collapsed.
  - `ph.status !== 'completed'` defaults to expanded.
- **Bulk Toggle**:
  - In the Roadmap header (`Roadmap Stages & Deliverables`), add an "Expand All" / "Collapse All" button.

---

## 5. Potential Regressions & Mitigations

1. **Regression Risk**: Purging goals could accidentally delete user-created goals.
   - **Mitigation**: The purge filter targets strictly `Set(['life_goal_read_30_books', 'life_goal_genai_course', 'life_goal_lose_5kg'])`. User-created goals have distinct IDs (e.g. `goal_174...`) and are never touched.
2. **Regression Risk**: Phase click triggering unintended "Mark Complete" or checkbox toggle.
   - **Mitigation**: Add `e.stopPropagation()` to the "Mark Complete" button and task checkboxes so they do not inadvertently toggle phase collapse.
3. **Regression Risk**: State loss on tab switch.
   - **Mitigation**: Store `collapsedPhases` and `collapsedCards` at the `GoalsDashboard` component level keyed by `${goal.id}_${ph.id}` and `goal.id`.
