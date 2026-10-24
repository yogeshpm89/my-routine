# Approval Request: Life Goals Minor & Incremental Progress Tracking

## 1. Task Summary

- **Task ID**: `feature-009-life-goal-progress`
- **Task Title**: Life Goals Minor & Incremental Progress Tracking
- **Target Branch**: `feature/feature-009-life-goal-progress`
- **Starting Version**: `1.4.0` (`versionCode: 6`)
- **Target Version**: `1.5.0` (`versionCode: 8`)
- **Documentation Date**: 2026-10-24
- **Current Status**: **IMPLEMENTED & VERIFIED**

---

## 2. Problem Being Solved

In **My Routine**, users track long-term personal and professional life goals (such as reading 30 books, completing a generative AI course, or losing 5 kg). However, progress can currently only be recorded at the whole-goal level (e.g., adding `+1 book`). Users cannot record small, meaningful increments (such as reading 5 or 10 pages of a book, listening to 15 minutes of an audiobook, or completing a module section) directly from the application. Furthermore, the `GoalTrackedItem` entity has progress attributes (`currentUnits`, `totalUnits`, `unitLabel`), but the UI renders them as static, read-only bars with no interactive progress logging buttons.

---

## 3. Key Design Decisions

1. **Smallest Practical Granularity**:
   - Books: Trackable by pages (`+5`, `+10`, `+25`, `+50`) and custom amounts.
   - Audiobooks: Trackable by minutes (`+5m`, `+10m`, `+15m`, `+30m`).
   - Courses & Certifications: Trackable by modules, lessons, or hours (`+1`, `+2`).
   - Business & Projects: Trackable by tasks or milestones.
2. **Deterministic Parent Accumulation**:
   - When an item reaches 100% of its target units (e.g., 304/304 pages), it marks completed automatically and increments the parent life goal (e.g., 8 -> 9 books).
3. **Rich Audit Trail & Reversibility**:
   - Every progress increment creates a structured `GoalProgressLog` entry with the item name, delta, date, and reflection note.
   - Users can undo or delete any progress entry to revert mistakes.
4. **Frictionless UI**:
   - Quick increment chips right inside each item card for 1-tap logging.
   - `+ Log` button for logging with a reflection note or custom date.
5. **Zero Schema Breakage**:
   - Backward-compatible extension to `GoalProgressLog` and `GoalTrackedItem`.
   - Full support for offline `localStorage` and Firestore synchronization.

---

## 4. Main Files Expected to Change

| File Path | Action | Description |
|---|---|---|
| `src/types/goals.ts` | **Modify** | Extend `GoalProgressLog` with item attribution metadata (`itemId`, `itemTitle`, `unitLabel`, `itemCurrentUnits`, `itemTotalUnits`). |
| `src/lib/repositories/life-goal-repository.ts` | **Modify** | Add `logItemProgress`, `undoProgressLog`, and enrich `updateItemProgress` and `recalculateGoalProgress`. |
| `src/components/goals/item-quick-progress.tsx` | **Create** | Interactive quick increment chips (`+5`, `+10`, `+25`) and log trigger for tracked items. |
| `src/components/goals/log-item-progress-modal.tsx` | **Create** | Dedicated modal for custom item unit progress with notes, date, and visual percentage bar. |
| `src/components/goals/goals-dashboard.tsx` | **Modify** | Embed `ItemQuickProgress` in Items tab, wire item progress handlers, and add undo in History tab. |
| `src/app/page.tsx` | **Modify** | Implement and pass `handleLogItemProgress` and `handleUndoGoalProgressLog`. |
| `src/lib/repositories/life-goals.test.ts` | **Modify** | Unit tests for item incremental progress, parent roll-up, auto-completion, and undo. |

---

## 5. Verification & Testing Plan

1. **Automated Unit Tests**:
   - Execute `npx vitest run src/lib/repositories/life-goals.test.ts` to verify incremental logging, audit logs, auto-completion, and undo.
2. **Type Safety & Build Verification**:
   - Execute `npm run build:web` to ensure zero compilation or lint errors.
3. **Manual Flow Verification**:
   - Log 10 pages to *Deep Work* -> verify progress bar and audit entry.
   - Log remaining pages to reach 304 -> verify item completes and parent goal increments to 9 books.
   - Undo entry -> verify state cleanly reverts.

---

## 6. Request for Approval

In accordance with the My Routine workflow:
> **No application code, tests, or git branches will be modified until you explicitly review and approve this plan.**

Please confirm if you approve the creation of branch `feature/feature-009-life-goal-progress` and the execution of this plan.
