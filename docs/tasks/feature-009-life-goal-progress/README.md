# Feature-009: Life Goals Minor & Incremental Progress Tracking

## 1. Executive Summary

- **Task ID**: `feature-009-life-goal-progress`
- **Task Title**: Life Goals Minor & Incremental Progress Tracking
- **Category**: Feature Enhancement
- **Target Branch**: `feature/feature-009-life-goal-progress`
- **Starting Version**: `1.4.0` (`versionCode: 6`)
- **Target Version**: `1.5.0` (`versionCode: 7`)
- **Documentation Date**: 2026-10-24
- **Current Status**: **AWAITING USER APPROVAL**

---

## 2. Background & Objective

In **My Routine**, users manage long-term personal and professional life goals (e.g., *Read 30 books in 1 year*, *Complete Generative AI Course in 1-2 months*, *Lose 5 kg weight in 3 months*). Under each life goal, users organize granular tracked items (books, courses, projects, resources), roadmap phases, checklists, and daily routine activity links.

However, recording progress currently suffers from a critical granularity gap:
1. **Goal-Level Logging Only**: The existing `LogProgressModal` only increments the root life goal (e.g., adding `+1 book` or `-0.5 kg`). Users cannot log reading `5 pages`, `10 pages`, or `25 pages` of a specific book (such as *Deep Work* or *Atomic Habits*).
2. **Missing Item-Level Quick Controls**: The `GoalTrackedItem` entity contains `currentUnits`, `totalUnits`, and `unitLabel` (e.g., `185 / 304 pages`), but the UI in `GoalsDashboard` renders these purely as read-only progress bars without any interactive action chips or log buttons.
3. **No Incremental Roll-Up**: When a user reads pages or completes course sections, there is no automatic audit trail linking that minor achievement to the parent Life Goal or recalculating parent completion when an item reaches 100%.
4. **Routine Execution Disconnect**: Daily scheduled activities (e.g., *Mindvalley / Self-learning 30 min*) log time to `activityRecords`, but cannot easily allocate that session's output (e.g., 20 pages read or 1 lesson completed) to the active tracked item.

### Objective
Enhance Life Goals tracking to allow users to record small, incremental progress at the smallest practical level (e.g., 5 pages read, 1 section completed, 10 minutes of audiobook, 15 minutes of skill practice) frequently and effortlessly, with automatic accumulation to parent entities and full audit history.

---

## 3. Real-World User Scenarios

1. **Book Reading (Pages & Audiobooks)**:
   - A user opens *Read 30 books in 1 year*, views the active book *Deep Work* (185/304 pages), and taps `+10` after a morning reading session. The book updates to 195/304 pages (64%), and an audit entry is created: *"Read 10 pages of Deep Work"*.
   - When the user reaches 304/304 pages, the book automatically marks as completed, and the parent goal increments from 8 to 9 books read.
2. **Audiobooks & Podcasts (Minutes)**:
   - A user listens to an audiobook during a 15-minute commute. With one tap on `+15m`, progress increases from 45m to 60m of a 240m audiobook.
3. **Online Courses & Certifications (Modules & Topics)**:
   - A user working on *Generative AI with Large Language Models* completes lab assignment 3. They tap `+1 mod` on the course item, advancing progress from 3/5 to 4/5 modules.
4. **Project Milestones & Business Tasks**:
   - A user completes a single sub-task or section within a business goal phase. The phase progress advances incrementally without requiring the entire phase to be marked complete.
5. **Quick Log with Reflection**:
   - A user reads 18 pages and wants to record a note: *"Cal Newport's bimodal scheduling framework"*. They tap the `+ Log` button on the book item, input `18` pages with the note, and save.

---

## 4. Core Principles

1. **Smallest Practical Granularity**: Enable logging at unit levels (pages, minutes, sections, modules, hours, sessions) without forcing full milestone/item completion.
2. **Deterministic Parent Accumulation**: When child items progress, parent entities automatically update their state and recalculate completion percentages.
3. **Auditability & Reversibility**: Every incremental progress event records a structured `GoalProgressLog` entry with timestamp, note, delta, and target item metadata. Users can undo or delete erroneous entries.
4. **Frictionless UI**: Provide 1-tap quick action chips (`+5`, `+10`, `+25`, `+50` for pages; `+5m`, `+10m`, `+15m`, `+30m` for time; `+1`, `+2` for units) alongside custom input.
5. **Zero Disruption to Existing Persistence**: Full backward compatibility with existing `LifeGoal` and `GoalTrackedItem` JSON records in LocalStorage and Firestore.

---

## 5. Acceptance Criteria

- [ ] **Data Model Extension**:
  - `GoalProgressLog` schema extended with optional `itemId`, `itemTitle`, `unitLabel`, `phaseId`, `phaseTitle`, `itemCurrentUnits`, and `itemTotalUnits`.
  - `GoalTrackedItem` supports optional `quickIncrements?: number[]` (or smart auto-generated increments based on `unitLabel`).
  - `LifeGoal` calculation engine supports roll-up logic for items and sub-entities.
- [ ] **Repository Layer**:
  - `LifeGoalRepository.logItemProgress` implemented for atomic incremental progress recording, audit logging, and parent recalculation.
  - `LifeGoalRepository.undoProgressLog` implemented to safely reverse a progress log entry and rollback item/goal units.
  - Existing `LifeGoalRepository.updateItemProgress` updated to maintain audit logs.
- [ ] **UI Implementation**:
  - `GoalsDashboard` Tracked Items tab displays inline quick increment chips (`+5`, `+10`, `+25`, `+50` / `+10m`, `+15m`, `+30m` / `+1`, `+2`).
  - Item card features a `+ Log` button opening `LogItemProgressModal` for custom delta/absolute units, date, and note.
  - Progress bar dynamically animates and shows updated percentage and remaining units.
  - Visual completion banner / celebration badge when an item reaches 100% units.
  - Goal History / Audit tab displays item-attributed progress logs with delete/undo action.
- [ ] **Testing & Quality**:
  - 100% test pass rate in Vitest for `life-goals.test.ts` and new unit tests.
  - Production build (`npm run build:web`) succeeds with zero TypeScript or lint errors.
