# Bug-014: Approval Request — Remove Unwanted Auto-Seeded Life Goals & Add Collapsible Goal Cards

## 1. Task Summary

- **Task ID**: `bug-014-remove-unwanted-seed-goals`
- **Task Title**: Remove Unwanted Auto-Seeded Life Goals & Add Collapsible Goal Card Sections
- **Source Issues**: [GitHub Issue #14: Remove these goals](https://github.com/yogeshpm89/my-routine/issues/14) & User Request for Collapsible Sections
- **Target Branch**: `bugfix/issue-14-remove-unwanted-seed-goals`
- **Prepared Date**: 2026-10-28
- **Documentation Location**: [`docs/tasks/bug-014-remove-unwanted-seed-goals/`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/docs/tasks/bug-014-remove-unwanted-seed-goals/)

---

## 2. Problems Being Solved

1. **Unwanted Auto-Seeded Life Goals (Issue #14)**:
   Three hardcoded goals (*"Read 30 books in 1 year"*, *"Complete Generative AI course in next 1-2 months"*, *"Lose 5 kg weight in 3 months"*) unexpectedly pop up in the user's account and get saved to local storage and Cloud Firestore.
2. **Oversized Goal Cards & Uncollapsed Phases**:
   Goal cards with large roadmaps (such as reading roadmaps with 13 phases and 297 total steps) display all phases and all steps expanded at once, stretching the card across thousands of vertical pixels and overwhelming the screen.

---

## 3. Expected Behavior

1. **Zero Default Goals**: Unseeded or new users start with an empty life goals dashboard (`[]`).
2. **Deterministic Purge**: Existing accounts with the 3 legacy seed IDs have them automatically purged from `localStorage` and deleted from Cloud Firestore.
3. **Card-Level Collapse Toggle**: In each goal card header, a minimize/expand button toggles between a compact summary (~120px tall showing badges, title, and progress bar) and the full card with all tabs.
4. **Phase-Level Accordion in Roadmap**: Each roadmap phase (e.g., "Awaken the Giant Within — Tony Robbins" with 26 steps) can be collapsed or expanded individually with a chevron toggle.
5. **Smart Phase Defaults**: Completed phases auto-collapse by default so users focus immediately on active/in-progress phases.
6. **"Expand All / Collapse All" Control**: A one-click toggle in the Roadmap header toggles all phases at once.
7. **User Data Safety**: User-created goals and tasks are 100% preserved.

---

## 4. Main Files Expected to Change

| File Path | Action | Scope of Change |
|---|---|---|
| [`src/lib/seed-goals.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts) | Modify | Return `[]` from `getInitialLifeGoals`, export `getSampleLifeGoals`. |
| [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts) | Modify | Add `purgeLegacySeedGoals`, filter legacy seed IDs in local & remote sync. |
| [`src/lib/sync/backup-service.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sync/backup-service.ts) | Modify | In `resetToDefaultRoutine`, set `initialLifeGoals = []`. |
| [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx) | Modify | Add card collapse toggle, phase accordion, smart completed collapse, and bulk toggle. |
| [`src/lib/repositories/life-goals.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goals.test.ts) | Modify | Update fixture imports and add purge & empty default tests. |

---

## 5. Testing Strategy

1. **Unit Tests (`src/lib/repositories/life-goals.test.ts`)**:
   - Assert `getInitialLifeGoals(userId)` returns `[]`.
   - Assert `LifeGoalRepository.getLocalLifeGoals(userId)` initializes `[]` when storage is clean.
   - Assert `LifeGoalRepository.purgeLegacySeedGoals(userId)` cleans seed goals from storage while preserving custom user goals.
   - Re-run all existing life goal repository tests with `getSampleLifeGoals` fixtures.
2. **Browser Verification (`http://localhost:3000`)**:
   - Verify Life Goals section starts clean with 0 goals and displays "+ Create New Goal".
   - In a goal card with a roadmap (like "Read 30 books"), verify phase accordion toggles open/closed smoothly.
   - Verify completed phases default to collapsed and active phases default to open.
   - Verify "Collapse All" / "Expand All" toggles all 13 phases in a single click.
   - Verify card collapse button collapses the card to a compact summary card.

---

## 6. Acceptance Criteria Checklist

- [ ] AC-001: Unseeded users see 0 goals by default in the Life Goals section.
- [ ] AC-002: Existing accounts with the 3 seed goals have them automatically purged from `localStorage` and deleted from Cloud Firestore.
- [ ] AC-003: User-created goals remain intact and unaffected.
- [ ] AC-004: Resetting default routine leaves life goals clean (`[]`).
- [ ] AC-005: Each phase in the Roadmap tab displays a chevron toggle; clicking a phase collapses or expands its steps without affecting other phases.
- [ ] AC-006: Completed phases default to collapsed; active phases default to open.
- [ ] AC-007: Clicking "Collapse All" / "Expand All" in the Roadmap tab toggles all phases at once.
- [ ] AC-008: Clicking the card collapse button in the goal card header collapses the card into a compact summary card (~120px tall) showing badges, title, and progress bar, and clicking again expands full details.
- [ ] AC-009: All unit tests in `life-goals.test.ts` pass, including verification of empty default state and legacy seed goal cleanup.

---

## Approval Status

- **Status**: **APPROVED**
- **Approval Date**: 2026-10-28
- **Approved Scope**:
  1. Return `[]` from `getInitialLifeGoals(userId)` in `src/lib/seed-goals.ts`.
  2. Implement `purgeLegacySeedGoals(userId)` in `src/lib/repositories/life-goal-repository.ts` to purge the 3 legacy seed IDs from local storage, mutation queue, and Firestore.
  3. Ensure routine reset leaves life goals clean in `src/lib/sync/backup-service.ts`.
  4. Implement card-level collapse toggle in goal card header in `src/components/goals/goals-dashboard.tsx`.
  5. Implement phase-level accordion with chevrons in Roadmap tab in `src/components/goals/goals-dashboard.tsx`.
  6. Implement "Expand All / Collapse All" toggle in Roadmap header in `src/components/goals/goals-dashboard.tsx`.
  7. Smart default for phases: completed phases collapsed, active phases open.
  8. Update Vitest unit tests in `src/lib/repositories/life-goals.test.ts`.
