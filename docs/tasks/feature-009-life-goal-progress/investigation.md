# Investigation: Life Goals Minor & Incremental Progress Tracking

## 1. Relevant Repository Structure

```
my-routine/
├── src/
│   ├── app/
│   │   └── page.tsx                     # Top-level state coordination (lifeGoals, handleUpdateItemProgress, handleLogGoalProgress)
│   ├── components/
│   │   ├── goals/
│   │   │   ├── goals-dashboard.tsx      # Main Life Goals dashboard tabs (items, phases, lists, experiences, tracker, activity)
│   │   │   ├── log-progress-modal.tsx   # Goal-level progress logging modal
│   │   │   ├── item-editor-modal.tsx    # Modal to add/edit GoalTrackedItem metadata
│   │   │   ├── goal-editor-modal.tsx    # Modal to create/edit LifeGoal
│   │   │   └── log-activity-modal.tsx   # Modal to log routine activity to LifeGoal
│   │   └── routine/
│   │       └── today-timeline.tsx       # Timeline with active Life Goals teaser banner
│   ├── lib/
│   │   ├── repositories/
│   │   │   ├── life-goal-repository.ts  # Core repository: LocalStorage, MutationQueue, Firestore sync, recalculation
│   │   │   └── life-goals.test.ts       # Vitest test suite for LifeGoalRepository
│   │   ├── seed-goals.ts                # Default seed goals (Read 30 books, GenAI course, Lose 5kg)
│   │   ├── sync/
│   │   │   ├── backup-service.ts        # JSON backup export/import
│   │   │   ├── mutation-queue.ts        # Offline mutation queue ('life_goals')
│   │   │   └── sync-engine.ts           # Background sync coordinator
│   │   └── time-utils.ts                # Date formatting and timezone utilities
│   └── types/
│       ├── goals.ts                     # LifeGoal, GoalTrackedItem, GoalProgressLog schemas
│       └── routine.ts                   # RoutineTemplate, ActivityOccurrence schemas
```

---

## 2. Existing Data Models Audit

### A. `LifeGoal` (`src/types/goals.ts`)
```ts
export const LifeGoalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1),
  domain: GoalDomainSchema.default('personal'),
  category: z.string().default('other'),
  priority: GoalPrioritySchema.optional(),
  trackingMode: GoalTrackingModeSchema.optional(), // 'phases' | 'tasks' | 'metric' | 'habits' | 'journey'

  // Metric targets
  metricType: GoalMetricTypeSchema.optional(),     // 'numeric' | 'milestone' | 'decrement' | 'boolean'
  startValue: z.number().default(0),
  currentValue: z.number().default(0),
  targetValue: z.number().default(1),
  unit: z.string().default(''),

  phases: z.array(GoalPhaseSchema).optional(),
  lists: z.array(GoalNamedListSchema).optional(),
  experiences: z.array(GoalExperienceEntrySchema).optional(),
  milestones: z.array(GoalMilestoneSchema).optional(),
  checklist: z.array(GoalChecklistItemSchema).optional(),
  items: z.array(GoalTrackedItemSchema).optional(),

  progressLogs: z.array(GoalProgressLogSchema).default([]),
  activityRecords: z.array(GoalActivityRecordSchema).optional(),
  linkedTemplateIds: z.array(z.string()).optional(),
  autoTrackFromActivities: z.boolean().optional(),
  status: GoalStatusSchema.default('in_progress'),
  color: z.string().default('#3b82f6'),
  createdAt: z.number(),
  updatedAt: z.number(),
});
```

### B. `GoalTrackedItem` (`src/types/goals.ts`)
```ts
export const GoalTrackedItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  itemType: z.enum(['book', 'course', 'project', 'resource', 'other']).default('other'),
  authorOrInstructor: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).default('in_progress'),

  currentUnits: z.number().default(0),
  totalUnits: z.number().default(0),
  unitLabel: z.string().default('pages'),

  summary: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  primaryLink: z.string().optional(),
  audioLinkOrPath: z.string().optional(),
  localFilePath: z.string().optional(),
  links: z.array(GoalItemLinkSchema).optional(),
  customFields: z.array(GoalCustomFieldSchema).optional(),
  rating: z.number().min(1).max(5).optional(),
  completedAt: z.number().optional(),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});
```

### C. `GoalProgressLog` (`src/types/goals.ts`)
```ts
export const GoalProgressLogSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valueChange: z.number(),
  currentValue: z.number(),
  note: z.string().default(''),
  createdAt: z.number().default(() => Date.now()),
});
```

---

## 3. Findings & Deficiencies in Current Implementation

### Finding 1: Unwired Handler & Read-Only Items UI
In `src/app/page.tsx`, `handleUpdateItemProgress` is defined and passed to `<GoalsDashboard onUpdateItemProgress={handleUpdateItemProgress} />`.
However, inside `src/components/goals/goals-dashboard.tsx`:
- `onUpdateItemProgress` is destructured in the component header, but **never referenced or called** anywhere in the JSX.
- Tracked items (books, courses, projects) display progress text: `{item.currentUnits} / {item.totalUnits} {item.unitLabel}` and a progress bar, but provide **only Edit and Delete buttons**.
- Users cannot log progress on an item directly from the UI.

### Finding 2: `updateItemProgress` Lacks Delta Incrementing & Audit Logging
In `src/lib/repositories/life-goal-repository.ts`:
```ts
static async updateItemProgress(userId, goalId, itemId, currentUnits, markCompleted)
```
- It accepts an absolute `currentUnits` value, not an incremental delta (`+5`, `+10`).
- It **does not create a `GoalProgressLog` entry**, meaning minor progress updates leave no timestamped audit history or reflection note.
- It only increments the parent goal `currentValue` by 1 if `markCompleted` or `currentUnits >= totalUnits` AND `metricType === 'numeric'`. If the item advances from 185 to 200 pages, the parent goal has zero record of this effort.

### Finding 3: `GoalProgressLog` Missing Sub-Entity Context
`GoalProgressLog` only records `valueChange` and `currentValue` for the root goal. If a user logs "Read 10 pages of Deep Work", the current schema has no fields for:
- `itemId` (e.g., `'item_book_2'`)
- `itemTitle` (e.g., `'Deep Work'`)
- `unitLabel` (e.g., `'pages'`)
- `itemCurrentUnits` / `itemTotalUnits`
Without these, the progress history cannot distinguish between a parent goal increment (e.g., +1 book completed) and an item minor progress event (e.g., +10 pages read).

### Finding 4: Incomplete `recalculateGoalProgress` Modes
In `LifeGoalRepository.recalculateGoalProgress`:
- Modes handled: `'phases'`, `'tasks'`, `'habits'`.
- Modes unhandled: Items tracking. There is no automatic logic to compute parent progress from child items if the goal is item-based.

### Finding 5: No Undo or Reversal Capability
If a user taps `+50` by mistake or enters the wrong page number, there is no one-tap undo function to roll back the progress entry and restore the previous unit count.

---

## 4. Seed Data Audit

Existing seed data in `src/lib/seed-goals.ts` demonstrates the exact target hierarchy:
1. `life_goal_read_30_books`:
   - Target: `30 books`, Current: `8 books`.
   - Items:
     - *Atomic Habits*: `320 / 320 pages`, `status: 'completed'`.
     - *Deep Work*: `185 / 304 pages`, `unitLabel: 'pages'`, `status: 'in_progress'`.
     - *Thinking, Fast and Slow*: `0 / 499 pages`, `status: 'not_started'`.
2. `life_goal_genai_course`:
   - Target: `5 modules`.
   - Items:
     - *Generative AI with Large Language Models*: `3 / 5 modules`, `status: 'in_progress'`.
3. `life_goal_lose_5kg`:
   - Target: `5 kg` weight loss.
   - Items:
     - *Macro-Nutrient Nutrition & Clean Deficit Plan*: `5 / 12 weeks`.

These entities are already rich with units and targets, meaning **no parallel database or schema migration is needed**. We simply need to unlock interactive, incremental logging on these existing structures.
