# Bug-014: Implementation & Testing Plan — Remove Seed Goals & Add Collapsible Goal Cards

## 1. Proposed Solution

The goal of this task is twofold:
1. **Remove Unwanted Auto-Seeded Life Goals**: Ensure life goals start empty (`[]`) for new users, purge the 3 legacy seed goals from `localStorage` and Cloud Firestore for existing accounts, and prevent re-seeding on sync or reset.
2. **Collapsible Sections on Life Goal Cards**:
   - Provide a **Card-Level Collapse Toggle** in each goal card header, allowing the card to collapse into a clean, compact summary card (~120px tall) showing only badges, title, and progress bar.
   - Provide a **Phase-Level Accordion** inside the Roadmap tab with chevron toggles, allowing phases (like "Awaken the Giant Within — Tony Robbins" with 26 steps) to collapse and expand individually.
   - Provide an **"Expand All / Collapse All"** button in the Roadmap header to toggle all phases in one click.
   - Implement **Smart Defaults**: Completed phases auto-collapse by default so users focus immediately on active steps.

---

## 2. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Data & Sync Layer
        A[LifeGoalRepository.getLocalLifeGoals] --> B{localStorage empty?}
        B -- Yes --> C[Initialize localStorage with []]
        B -- No --> D[Filter out LEGACY_SEED_GOAL_IDS]
        D --> E[Save cleaned array back to localStorage]
        E --> F[getLifeGoals / subscribeLifeGoals]
        F --> G{Firestore has legacy seed docs?}
        G -- Yes --> H[deleteDoc legacy docs & dequeue mutations]
        G -- No --> I[Return Clean Life Goals List]
        C --> I
        H --> I
    end

    subgraph UI Presentation Layer
        I --> J[GoalsDashboard]
        J --> K[Goal Card Header]
        K --> L[Minimize / Expand Button: ChevronUp / ChevronDown]
        L -- Collapsed --> M[Compact Card: Badges + Title + Progress Bar only]
        L -- Expanded --> N[Full Card: Motivation + Sub-Nav Tabs + Active Tab Content]
        
        N --> O[Roadmap Tab]
        O --> P[Expand All / Collapse All Toggle]
        O --> Q[Phase Accordion Cards]
        Q --> R{Phase Status}
        R -- Completed --> S[Default Collapsed: ChevronRight + Header summary]
        R -- In-Progress --> T[Default Expanded: ChevronDown + Steps Checkboxes]
    end
```

---

## 3. Data Model Changes

No schema modifications are required. The TypeScript interface [`LifeGoal`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/types/goals.ts) remains completely unchanged. All collapse states are managed in component state.

---

## 4. File-by-File Implementation Plan

| File Path | Action | Purpose | Verification |
|---|---|---|---|
| [`src/lib/seed-goals.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts) | Modify | Return `[]` from `getInitialLifeGoals(userId)`. Export `getSampleLifeGoals(userId)` for test fixtures. | Vitest unit test |
| [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts) | Modify | 1. Initialize `[]` when localStorage is empty.<br>2. Add `LEGACY_SEED_GOAL_IDS`.<br>3. Add `purgeLegacySeedGoals(userId)`.<br>4. Exclude seed IDs from remote sync queries & auto-delete from Firestore.<br>5. Do not auto-upload local goals to Firestore if empty or only seed goals. | Vitest unit test |
| [`src/lib/sync/backup-service.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sync/backup-service.ts) | Modify | In `resetToDefaultRoutine(userId)`, set `initialLifeGoals = []`. | Vitest unit test |
| [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx) | Modify | 1. Add `collapsedCards` state and card minimize toggle button.<br>2. Add `collapsedPhases` state and accordion toggle to phase headers.<br>3. Add "Expand All / Collapse All" toggle in Roadmap header.<br>4. Auto-collapse completed phases by default. | Browser verification |
| [`src/lib/repositories/life-goals.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goals.test.ts) | Modify | Update fixture imports to `getSampleLifeGoals`. Add test verifying `getInitialLifeGoals` returns `[]` and `purgeLegacySeedGoals` deletes seed goals from storage and Firestore. | Vitest unit test |

---

## 5. Implementation Phases

### Phase 1: Update Seed Goals Definition
- **Objective**: Change default initial life goals to empty list while preserving fixtures for tests.
- **Tasks**:
  1. In `src/lib/seed-goals.ts`:
     - Rename the mock generator to `getSampleLifeGoals(userId: string): LifeGoal[]`.
     - Update `getInitialLifeGoals(userId: string): LifeGoal[]` to return `[]`.
- **Validation**: TypeScript compilation check.

### Phase 2: Implement Purge & Guard in `LifeGoalRepository`
- **Objective**: Clean local storage, scrub Firestore, and prevent re-seeding.
- **Tasks**:
  1. Define constant:
     ```typescript
     export const LEGACY_SEED_GOAL_IDS = new Set([
       'life_goal_read_30_books',
       'life_goal_genai_course',
       'life_goal_lose_5kg',
     ]);
     ```
  2. In `getLocalLifeGoals(userId)`:
     - If raw is missing, save `[]` to localStorage and return `[]`.
     - If raw exists, filter out items matching `LEGACY_SEED_GOAL_IDS`. If items were removed, save the cleaned array.
  3. Implement `static async purgeLegacySeedGoals(userId: string): Promise<void>`:
     - Remove legacy IDs from local storage.
     - Dequeue/clear any pending mutations for these IDs in `MutationQueue`.
     - If `canSyncWithFirestore(userId)`, call `deleteDoc` for each legacy seed ID.
  4. In `getLifeGoals(userId)` and `subscribeLifeGoals(userId)`:
     - Filter out legacy seed goal IDs from remote snapshots.
     - Call `purgeLegacySeedGoals(userId)` during initialization.
- **Validation**: Unit tests for `purgeLegacySeedGoals`.

### Phase 3: Implement Collapsible Goal Cards & Roadmap Accordion in `goals-dashboard.tsx`
- **Objective**: Provide card-level collapse, phase-level accordion, bulk toggle, and smart defaults.
- **Tasks**:
  1. Add component state:
     ```typescript
     const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
     const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
     ```
  2. In the Goal Card Header (next to Edit/Delete):
     - Add a minimize/expand toggle button with `ChevronUp` / `ChevronDown`.
     - When `collapsedCards[goal.id]` is true, conditionally hide the Motivation quote, Sub-Navigation Tabs, and Active Tab Content.
  3. In the Roadmap Header:
     - Add a button for "Expand All" / "Collapse All" that toggles all phases for `goal.id`.
  4. In Each Phase Card (`phases.map`):
     - Determine collapse state: if `collapsedPhases[`${goal.id}_${ph.id}`]` is undefined, default to `ph.status === 'completed'`.
     - Add a clickable header with `ChevronDown` (expanded) / `ChevronRight` (collapsed).
     - Render the phase steps list and quick-add input conditionally only when expanded.
     - Add `e.stopPropagation()` to "Mark Complete" and task checkbox clicks to prevent triggering phase collapse.
- **Validation**: Manual browser verification on `http://localhost:3000`.

### Phase 4: Update Backup Service & Unit Tests
- **Objective**: Ensure 100% test pass rate with full coverage of the bug fix and clean backups.
- **Tasks**:
  1. In `src/lib/sync/backup-service.ts`, `resetToDefaultRoutine`:
     - Set `initialLifeGoals = []`.
  2. In `src/lib/repositories/life-goals.test.ts`:
     - Update tests that used `getInitialLifeGoals` for mock data to use `getSampleLifeGoals`.
     - Add test: `getInitialLifeGoals returns empty array []`.
     - Add test: `LifeGoalRepository.getLocalLifeGoals returns [] for unseeded user`.
     - Add test: `purgeLegacySeedGoals removes unwanted seed goals from storage`.
- **Validation**: Run `npx vitest run src/lib/repositories/life-goals.test.ts`.

---

## 6. Testing Strategy

1. **Unit Tests**:
   - Verify `getInitialLifeGoals(userId)` returns `[]`.
   - Verify `LifeGoalRepository.getLocalLifeGoals(userId)` initializes to `[]` when storage is clean.
   - Verify `LifeGoalRepository.purgeLegacySeedGoals(userId)` purges seed IDs and leaves user goals intact.
   - Verify all 25+ existing life goals tests pass with `getSampleLifeGoals`.
2. **Browser Verification**:
   - Verify that the Life Goals dashboard displays 0 goals for a fresh user and does not pop up the 3 sample goals.
   - In a goal card with a roadmap (e.g. "Read 30 books"), verify that clicking a phase header collapses/expands that phase's steps.
   - Verify that completed phases default to collapsed and active phases default to open.
   - Verify that clicking "Collapse All" collapses all phases, and "Expand All" expands all phases.
   - Verify that clicking the card minimize button in the header collapses the entire card to ~120px height showing badges, title, and progress gauge.

---

## 7. Definition of Done Checklist

- [ ] `getInitialLifeGoals(userId)` returns `[]`.
- [ ] `LifeGoalRepository.getLocalLifeGoals(userId)` returns `[]` on fresh start.
- [ ] `purgeLegacySeedGoals(userId)` purges the 3 legacy seed IDs from local storage and Firestore.
- [ ] Remote Firestore sync filters out legacy seed documents and cleans them.
- [ ] Resetting default routine leaves life goals empty.
- [ ] User-created life goals are completely preserved.
- [ ] Goal card has a card-level collapse button to toggle compact summary mode.
- [ ] Each phase in the Roadmap tab has an accordion toggle to collapse/expand its steps.
- [ ] Roadmap header has an "Expand All / Collapse All" toggle.
- [ ] Completed phases default to collapsed; active phases default to open.
- [ ] `life-goals.test.ts` passes with 100% success rate.
- [ ] Production build (`npm run build`) passes without errors.

---

## 8. Complexity Estimate

- **Complexity**: Small to Medium
- **Primary Uncertainty**: Clean animation and responsive layout when collapsing phases on mobile and desktop.
