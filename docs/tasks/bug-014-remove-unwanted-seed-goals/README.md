# Bug-014: Remove Unwanted Auto-Seeded Life Goals & Add Collapsible Goal Card Sections

## 1. Task Metadata

- **Task ID**: `bug-014-remove-unwanted-seed-goals`
- **Task Title**: Remove Unwanted Auto-Seeded Life Goals & Add Collapsible Goal Card Sections
- **Task Type**: Bug Fix & UX Enhancement
- **Source Issue**: [GitHub Issue #14: Remove these goals](https://github.com/yogeshpm89/my-routine/issues/14) and User Card Collapsibility Request
- **Target Branch**: `bugfix/issue-14-remove-unwanted-seed-goals`
- **Documentation Date**: 2026-10-28
- **Current Stage**: Phase 9 — Completed (Awaiting Commit & Push Authorization)
- **Approval Status**: **APPROVED & IMPLEMENTED**

---

## 2. Problem Statement

Two interrelated usability issues affect the **Life Goals** section of **My Routine**:

1. **Unwanted Auto-Seeded Life Goals**:
   When users open the Life Goals dashboard, three pre-configured seed goals unexpectedly pop up in their account even though the user never added them:
   - *"Read 30 books in 1 year"* (`life_goal_read_30_books`)
   - *"Complete Generative AI course in next 1-2 months"* (`life_goal_genai_course`)
   - *"Lose 5 kg weight in 3 months"* (`life_goal_lose_5kg`)

   The user reported in [GitHub Issue #14](https://github.com/yogeshpm89/my-routine/issues/14):
   > *"Here these goals popup in my life goals section, I never added these. Remove these goals."*

2. **Oversized Life Goal Cards & Lack of Section Collapsibility**:
   Life goal cards with detailed roadmaps (such as reading roadmaps with 13 phases and 297 chapter steps) are excessively tall because every phase and task is rendered fully expanded simultaneously. This stretches the card across thousands of vertical pixels, making it difficult to navigate, scan other goals, or focus on the current active deliverable.
   
   The user requested:
   > *"the goal card is very big. can we collapse the sections on lifes goal card"*

---

## 3. Current Behavior (Verified from Codebase)

1. **Auto-seeding in Repository**: In [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts#L37-L68), `LifeGoalRepository.getLocalLifeGoals(userId)` calls `getInitialLifeGoals(userId)` when `localStorage` has no record for the user.
2. **Hardcoded Seed Goals in `seed-goals.ts`**: In [`src/lib/seed-goals.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts#L4-L473), `getInitialLifeGoals(userId)` returns an array containing the three hardcoded sample goals.
3. **Automatic Push to Cloud Firestore**: When `LifeGoalRepository.getLifeGoals(userId)` or `LifeGoalRepository.subscribeLifeGoals(userId)` runs for an authenticated user, if the user's Firestore collection `users/${userId}/life_goals` is empty, it writes each local goal to Firestore via `setDoc`.
4. **Persistent Sync Loop**: Because the seed goals are saved to Firestore, subsequent logins, cache clearances, or cross-device synchronizations fetch these 3 documents back into local storage, making them persistently reappear.
5. **Routine Reset Behavior**: In [`src/lib/sync/backup-service.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sync/backup-service.ts#L263), `BackupService.resetToDefaultRoutine(userId)` also invokes `getInitialLifeGoals(userId)` and saves them locally and to Firestore.
6. **No Collapsible Controls in Goal Cards**: In [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx#L938-L1080):
   - Every phase in the Roadmap tab displays all of its tasks/steps immediately with no accordion or collapse mechanism.
   - The goal card itself has no minimize/collapse button to collapse into a compact summary card.
   - There is no "Expand All / Collapse All" control.

---

## 4. Expected Behavior

1. **Clean Empty State**: For new users or any uninitialized state, the Life Goals section must start with **zero goals** (`[]`). No goals are generated without explicit user choice.
2. **Automated Purge of Legacy Seeded Goals**: Existing accounts that already had the unwanted seed goals auto-saved into `localStorage` and uploaded to Firestore must be automatically cleaned up upon application load.
3. **Firestore Clean-up**: The three specific seed IDs (`life_goal_read_30_books`, `life_goal_genai_course`, `life_goal_lose_5kg`) must be deleted from Firestore and removed from any pending mutation queues.
4. **User Data Safety**: User-created goals (any goal created by the user with a custom/generated ID) must remain 100% untouched and preserved.
5. **Phase-Level Accordion**: Each phase in the Roadmap tab can be collapsed or expanded by clicking its header or a dedicated chevron icon.
6. **Card-Level Collapse Toggle**: Each goal card has an expand/collapse toggle in its header to collapse the card into a sleek compact summary (badges, title, progress bar, countdown) or expand to full details (motivation, sub-navigation tabs, active tab content).
7. **Expand All / Collapse All Control**: A quick-action button in the Roadmap header toggles all phases between collapsed and expanded in a single click.
8. **Smart Default Phase State**: Completed phases are collapsed by default so users focus immediately on active/in-progress roadmap phases.

---

## 5. Functional Requirements

- **FR-001: Empty Initial Life Goals**
  `getInitialLifeGoals(userId)` in [`src/lib/seed-goals.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts) must return an empty array `[]`.
- **FR-002: Default Local State Initialization**
  `LifeGoalRepository.getLocalLifeGoals(userId)` in [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts) must return and persist `[]` when no local storage record exists.
- **FR-003: Legacy Seed Goal Purge Utility**
  Implement `LifeGoalRepository.purgeLegacySeedGoals(userId)`:
  - Identifies goals matching known auto-seed IDs (`life_goal_read_30_books`, `life_goal_genai_course`, `life_goal_lose_5kg`).
  - Removes them from `localStorage`.
  - Clears any pending mutations in `MutationQueue` for these doc IDs.
  - Deletes them from Firestore using `deleteDoc(doc(db, users/${userId}/life_goals, id))`.
  - Executes automatically during repository initialization / sync.
- **FR-004: Remote Sync Filter**
  In `LifeGoalRepository.getLifeGoals` and `LifeGoalRepository.subscribeLifeGoals`, filter out any legacy seed goal documents coming from Firestore and trigger background deletion of those documents.
- **FR-005: Backup Service Default Routine Reset**
  In [`src/lib/sync/backup-service.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sync/backup-service.ts), `resetToDefaultRoutine(userId)` must set life goals to `[]` instead of populating mock seed goals.
- **FR-006: Preserved Test Fixtures**
  Export sample goal fixtures (e.g. `getSampleLifeGoals(userId)` in `src/lib/seed-goals.ts`) so that existing repository unit tests can continue to test deep functionality without polluting production user state.
- **FR-007: Phase Accordion in Roadmap**
  In [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx), each phase block must feature an accordion header with a chevron icon (`ChevronDown` / `ChevronRight`). Clicking the header toggles visibility of the phase's tasks/steps and quick-add input.
- **FR-008: Smart Phase Default State & "Expand All / Collapse All"**
  - Phases with status `completed` default to collapsed. Active/in-progress phases default to expanded.
  - A button at the top of the Roadmap tab allows one-click "Expand All" or "Collapse All" across all phases.
- **FR-009: Card-Level Collapse / Expand Toggle**
  In the goal card header row (next to Edit and Delete buttons), provide a chevron button (`ChevronUp` / `ChevronDown`) that collapses the card down to its compact overview (Title, badges, progress bar, countdown) or expands all card tabs and details.

---

## 6. Non-Functional Requirements

- **NFR-001 (Data Safety)**: User-created life goals must NEVER be deleted or modified; only the 3 specific legacy seed IDs are targeted for cleanup.
- **NFR-002 (Offline Resilience)**: Purge operations must update local storage immediately and queue remote deletions gracefully if offline.
- **NFR-003 (Performance & Zero Layout Shift)**: Phase and card accordion toggling must be instantaneous without full-page re-renders.
- **NFR-004 (UX Cleanliness)**: When no goals exist, the Life Goals dashboard renders its standard empty state inviting the user to create their first goal.
- **NFR-005 (Responsive Design)**: Collapsible controls must be touch-friendly on mobile screens and accessible via keyboard navigation.

---

## 7. Acceptance Criteria

- **AC-001**: A fresh user without existing life goals loads the application and sees 0 goals in the Life Goals tab with the standard empty state.
- **AC-002**: An existing user who had `life_goal_read_30_books`, `life_goal_genai_course`, or `life_goal_lose_5kg` in `localStorage` loads the application; those 3 goals are immediately removed from local storage and deleted from Firestore.
- **AC-003**: Any user-created goal (e.g. "Read 30 books" with custom phases or generated ID) remains present, active, and fully editable.
- **AC-004**: Resetting default routine via Settings does not re-inject the 3 unwanted life goals.
- **AC-005**: Each phase in the Roadmap tab displays a chevron toggle; clicking a phase collapses or expands its steps without affecting other phases.
- **AC-006**: Completed phases default to collapsed; active phases default to open.
- **AC-007**: Clicking "Collapse All" / "Expand All" in the Roadmap tab toggles all phases at once.
- **AC-008**: Clicking the card collapse button in the goal card header collapses the card into a compact summary card (~120px tall) showing badges, title, and progress bar, and clicking again expands full details.
- **AC-009**: All unit tests in `life-goals.test.ts` pass, including verification of empty default state and legacy seed goal cleanup.

---

## 8. Scope

### In Scope
- [`src/lib/seed-goals.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts): Update `getInitialLifeGoals` to return `[]`, export `getSampleLifeGoals` for test fixtures.
- [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts): Add `purgeLegacySeedGoals`, prevent auto-seeding to Firestore, filter legacy seed IDs in remote sync.
- [`src/lib/sync/backup-service.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sync/backup-service.ts): Update `resetToDefaultRoutine`.
- [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx): Implement card collapse toggle, phase accordion, and "Expand All / Collapse All" toggle.
- [`src/lib/repositories/life-goals.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goals.test.ts): Update test fixtures and add purge test assertions.

### Out of Scope
- Modifying standard routine schedule templates in `seed-data.ts` or `seed-templates.ts`.
- Changes to the Goal Editor modal preset options (users may still choose presets when explicitly clicking "Add Goal").
- Notification scheduling or Capacitor Android native configurations.

---

## 9. Requirement Traceability Matrix

| Requirement | Description | Acceptance Criteria | Implementation Component | Verification Test |
|---|---|---|---|---|
| FR-001 | Empty initial life goals | AC-001 | `seed-goals.ts` | Unit test in `life-goals.test.ts` |
| FR-002 | Default local storage state | AC-001 | `life-goal-repository.ts` | Unit test in `life-goals.test.ts` |
| FR-003 | Purge legacy seed goals | AC-002, AC-003 | `life-goal-repository.ts` | Unit test in `life-goals.test.ts` |
| FR-004 | Remote sync filter & delete | AC-002 | `life-goal-repository.ts` | Repository sync integration test |
| FR-005 | Routine reset clean state | AC-004 | `backup-service.ts` | Backup service test |
| FR-006 | Test fixture preservation | AC-009 | `seed-goals.ts` | Full vitest suite pass |
| FR-007 | Phase accordion in Roadmap | AC-005 | `goals-dashboard.tsx` | Browser interaction test |
| FR-008 | Smart phase defaults & bulk toggle | AC-006, AC-007 | `goals-dashboard.tsx` | Browser interaction test |
| FR-009 | Card-level collapse toggle | AC-008 | `goals-dashboard.tsx` | Browser interaction test |
