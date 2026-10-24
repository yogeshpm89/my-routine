# Task: Improve Goal Progress Tracking with Minute-Level & Unit-Based Updates

## A. Task Metadata

- **Task ID**: `feature-007-minute-level-goal-progress`
- **Task Title**: Improve Goal Progress Tracking with Minute-Level & Unit-Based Updates
- **Task Type**: Feature / Enhancement
- **Source Issue**: [GitHub Issue #7](https://github.com/yogeshpm89/my-routine/issues/7)
- **Documentation Date**: 2026-10-24
- **Current Workflow Stage**: Stage 6 — Implementation Completed & Verified
- **Approval Status**: APPROVED & IMPLEMENTED (v1.4.0, versionCode 6)

---

## B. Problem Statement

In the current **My Routine — Adaptive Schedule & Focus Engine** application, goal fulfillment is computed strictly on an all-or-nothing or block-level basis via scheduled routine occurrences (`ActivityOccurrence` and `ActivityLog`). Users cannot record progress toward a daily goal in small, incremental chunks (such as minutes, kilometers, chapters, or course topics) as they work throughout the day. 

Furthermore, goals that are not tied to recurring routine blocks (such as *Coursera*, which has `templateIds: []` in seed data) appear permanently as *Unscheduled* with 0% progress unless an entire routine occurrence is scheduled and marked complete. Users need a fast, low-friction mechanism to record progress toward their 9 daily goal targets directly from both the `AnalyticsTab` and an accessible collapsible Daily Goals Bar in `TodayTimeline`, with immediate calculation of completion percentages, remaining minutes, progress bars, and historical logging without double-counting routine completion records.

---

## C. Current Behavior

Based on codebase inspection of `src/types/routine.ts`, `src/lib/seed-data.ts`, `src/lib/analytics/analytics-calculator.ts`, `src/lib/repositories/goal-repository.ts`, and `src/components/analytics/analytics-tab.tsx`:

1. **Daily Goal Targets Model (`GoalTarget`)**:
   - Defined in `src/types/routine.ts` lines 150–165 with fields: `id`, `userId`, `title`, `categories`, `templateIds`, `frequency`, `targetMinutes`, `minMinutes`, `maxMinutes`, `targetTime`, `activeDays`, `isArchived`, `updatedAt`.
   - Seeded in `src/lib/seed-data.ts` lines 526–651 with 9 active goals:
     1. `goal_melodyarc_araynatech` (Melodyarc & ArayNatech, work, 510m / 8.5h target, 5 linked template IDs)
     2. `goal_fullmoon_meghmalhaar` (Fullmoon Styles & Megh Malhaar, business, 120m target)
     3. `goal_cycling_exercise` (Cycling & Exercise, fitness, 120m target)
     4. `goal_meditation` (Meditation, mindfulness, 30m target)
     5. `goal_coursera` (Coursera, learning, 30m target, `templateIds: []`)
     6. `goal_mindvalley` (Mindvalley / Self-learning, learning, 30m target)
     7. `goal_journalling` (Journalling, personal, 10m target)
     8. `goal_power_nap` (Power Nap, rest, 60m target)
     9. `goal_wakeup_target` (Wake-up Target, health, 10m target, targetTime 06:00)
2. **Current Progress Calculation**:
   - Progress is computed inside `AnalyticsCalculator.computeSummary` (`src/lib/analytics/analytics-calculator.ts` lines 132–189).
   - For each goal, it iterates through `occurrences` for that day/week.
   - If an occurrence matches the goal's `templateIds` (or category if `templateIds` is empty), it inspects `occ.log?.actualDurationMinutes` or falls back to full scheduled duration if status is `'completed'` (or 50% if `'partial'`).
   - If a goal has no matching scheduled routine block on that day (e.g. Coursera), it is marked `status = 'unscheduled'` with `actual = 0`.
3. **No Incremental Progress Entry Mechanism**:
   - There are currently no quick-add buttons or unit-specific inputs for daily goals.
   - There is no model or persistence store for individual incremental progress chunks.
   - Users cannot record fractional progress as they execute their goals in chunks throughout the day.

---

## D. Expected Behavior

1. **Goal-Specific Minimum Level Tracking**:
   - Each goal provides quick-add actions calibrated to its natural tracking unit:
     - **Cycling & Exercise**: Users can add distance in kilometers (e.g., `+1 km`, `+5 km`, `+10 km`, `+15 km`, or a custom numeric input such as `15` km). Automatically converts to normalized duration (e.g., standard 3 min/km pace = 45m for 15 km) toward the daily 120m target.
     - **Book Reading & Mindvalley**: Users can track at the chapter level (`+1 chapter`, `+1 ch`) or pages, in addition to minutes.
     - **Courses (Coursera)**: Users can track at the topic or module level (`+1 topic`, `+1 module`) or minutes.
     - **Time-Based Goals (Work, Meditation, Journalling, Power Nap)**: Tracked at the minimum minute level (`+1 min`, `+5 min`, `+10 min`, `+15 min`, `+30 min`, or custom minutes).
2. **Deterministic Minute-Based Calculation**:
   - Progress is computed using accumulated integer minutes:
     - `targetMinutes` = daily goal target duration in minutes.
     - `completedMinutes` = sum of valid progress entries and routine execution minutes for the selected goal and date.
     - `remainingMinutes` = `Math.max(0, targetMinutes - completedMinutes)`.
     - `rawPercentage` = `(completedMinutes / targetMinutes) * 100`.
     - `displayPercentage` = `Math.min(100, Math.round(rawPercentage * 10) / 10)` (formatted to 1 decimal place).
   - Displayed progress bar is capped at 100%, while true accumulated minutes and unit quantities (e.g. 15 km / 45m) are preserved and displayed accurately.
3. **Placement on Today View**:
   - In addition to the detailed `AnalyticsTab` cards, a collapsible "Daily Goals" bar is integrated directly into `TodayTimeline`.
   - Users can expand the bar and record progress in 1 tap without leaving the daily schedule.
4. **Double-Counting Prevention**:
   - Completed routine occurrences and manual incremental progress entries are combined cleanly without duplicate accumulation.
   - Completing a routine occurrence updates actual duration through `ActivityLog`, while manual progress is tracked via `GoalProgressEntry`.
5. **Immediate UI Feedback & Undo**:
   - Tapping a quick-add button immediately updates the goal's completed minutes, remaining minutes, percentage, and progress bar with smooth CSS transition and confirmation indicator (e.g., `+15 km recorded (45m)` or `+1 topic recorded`).
   - Users can undo the most recent entry with one tap or view entry history for the day.
6. **Persistence & Offline Operation**:
   - Progress entries persist in offline `localStorage` (`my_routine_goal_progress_${userId}`) and synchronize seamlessly to Cloud Firestore under `users/{userId}/goal_progress/{entryId}` when online.
   - Backup package includes goal progress data with full backward-compatibility for legacy backups.

---

## E. Functional Requirements

- **FR-001 (Goal Progress Data Model)**: Define `GoalProgressEntry` capturing `id`, `userId`, `goalId`, `date` (YYYY-MM-DD in Asia/Kolkata), `minutes` (positive integer), `unit` (`'minutes' | 'km' | 'chapters' | 'pages' | 'topics' | 'modules'`), `unitValue` (numeric value like 15 for 15 km), `source` (`'manual' | 'routine_completion' | 'timer'`), `routineLogId` (optional), `note` (optional), `createdAt`, and `updatedAt`.
- **FR-002 (Unit-Aware Quick-Add Actions)**:
  - For cycling goals: provide `+1 km`, `+5 km`, `+10 km`, `+15 km` actions.
  - For reading goals: provide `+1 ch`, `+5 ch`, `+10 min`, `+15 min`, `+30 min` actions.
  - For course goals: provide `+1 topic`, `+1 module`, `+15 min`, `+30 min` actions.
  - For time-based goals: provide `+1 min`, `+5 min`, `+10 min`, `+15 min`, `+30 min` actions.
- **FR-003 (Custom Duration & Unit Input)**: Provide a custom input allowing users to enter any positive number in the goal's native unit (e.g., typing `15` for 15 km, `2` for 2 chapters, or custom minutes) with an optional note.
- **FR-004 (Undo & Entry Deletion)**: Allow users to undo the most recent progress entry or view and delete specific entries from today's progress history.
- **FR-005 (Calculation Engine)**: Implement `GoalProgressCalculator.calculateProgress(targetMinutes, completedMinutes)` returning `completedMinutes`, `remainingMinutes`, `rawPercentage`, `displayPercentage`, and `isAchieved`.
- **FR-006 (Over-Target Handling)**: Preserve true accumulated minutes and units when progress exceeds the target, capping visual progress bars at 100% while displaying accurate total duration and 0 remaining minutes.
- **FR-007 (Fractional Hours Target Normalization)**: Normalize fractional hour targets (e.g. 8.5 hours for Melodyarc & ArayNatech) to integer minutes (510 minutes) prior to calculation.
- **FR-008 (Analytics Integration)**: Extend `AnalyticsCalculator.computeSummary` to accept `progressEntries?: GoalProgressEntry[]`, incorporating manual progress into daily and weekly goal fulfillments, category allocations, adherence rates, and deficit calculations.
- **FR-009 (Today Timeline Collapsible Quick Tracker)**: Provide a responsive, collapsible "Daily Goals" progress bar within `TodayTimeline` allowing users to view goal completion and log progress without leaving the schedule.
- **FR-010 (Offline-First Repository)**: Implement `GoalProgressRepository` with offline `localStorage` caching, optimistic UI updates, mutation queueing, and Firestore synchronization under `users/{userId}/goal_progress`.
- **FR-011 (Backup & Restore Upgrade)**: Include `goalProgress` in `BackupService.exportAllData` and support safe restoration in `importBackupData` while preserving legacy v1.0 and v1.1 compatibility.
- **FR-012 (Zero Double-Counting Guarantee)**: Enforce a strict separation between routine block execution durations and manual progress entries, guaranteeing that routine blocks do not double-count against manual progress.

---

## F. Non-Functional Requirements

- **NFR-001 (Timezone Integrity)**: All progress entries and daily reset boundaries must strictly adhere to `Asia/Kolkata` local calendar dates.
- **NFR-002 (Offline-First Performance)**: Progress entry logging, recalculation, and UI rendering must complete synchronously in under 16ms (60fps) without network latency.
- **NFR-003 (Input Validation & Safety)**: Reject zero, negative, empty, NaN, or excessively large (> 1440 min or > 500 km) duration inputs with clear inline error messaging.
- **NFR-004 (Mobile & Touch Usability)**: All interactive buttons must have minimum 44px tap targets, high-contrast text, clear visual active states, and full keyboard accessibility.
- **NFR-005 (Data Safety & Security)**: All mutations must be isolated under `users/{userId}/goal_progress` adhering to Firestore authenticated security rules.

---

## G. Acceptance Criteria

- [x] **AC-001**: User can add progress in 1-minute increments, native goal units (km for cycling, chapters for reading, topics for courses), or custom numeric amounts.
- [x] **AC-002**: For cycling goals, a user can enter a distance in kilometers (e.g. 15 km), which converts accurately to duration and updates progress.
- [x] **AC-003**: For reading and course goals, a user can log progress at chapter and topic levels.
- [x] **AC-004**: Daily goal completion percentage and remaining minutes update immediately after every progress entry without page reload.
- [x] **AC-005**: The calculation engine accurately computes percentages to 1 decimal place (e.g., 5 min of 30 min target = 16.7%, remaining = 25 min; 10 min = 33.3%, remaining = 20 min).
- [x] **AC-006**: When progress reaches or exceeds target duration (e.g. 35 min / 30 min), the goal is marked achieved, remaining minutes is 0, visual progress bar is capped at 100%, and true accumulated minutes (35 min) are preserved and displayed.
- [x] **AC-007**: A collapsible "Daily Goals" progress bar is available on `TodayTimeline` and allows expanding to log progress without leaving the schedule.
- [x] **AC-008**: User can undo the most recent progress entry or delete a specific entry from the goal's entry history for that day.
- [x] **AC-009**: Goals without linked routine blocks (such as *Coursera*) accumulate progress and update fulfillment status normally through incremental progress entries.
- [x] **AC-010**: No double-counting occurs between completed routine occurrence logs and manual incremental progress entries.
- [x] **AC-011**: Progress entries survive page reloads and browser restarts in offline guest mode and sync to Firestore when online.
- [x] **AC-012**: All automated unit tests (`npm test`), TypeScript verification (`npx tsc --noEmit`), and production web/mobile builds pass with zero errors.

---

## H. Scope

### In Scope
- `GoalProgressEntry` data model supporting minutes, km, chapters, and topics.
- `GoalProgressCalculator` calculation engine with unit conversion, 1-decimal rounding, remaining minutes, and over-target handling.
- `GoalProgressRepository` with offline `localStorage` caching, guest mode fallback, and Firestore sync.
- Interactive goal progress UI with unit-specific quick-add buttons (+1, +5, +10, +15 km, chapters, topics, minutes), custom input, undo, and entry history.
- Integration into `AnalyticsTab` Daily Goal Targets section.
- Collapsible Daily Goals Bar in `TodayTimeline`.
- Updating `AnalyticsCalculator` to incorporate goal progress entries into daily and weekly summaries, adherence rates, and deficit insights.
- `MutationQueue` and `BackupService` updates with legacy backup support.
- Comprehensive unit tests covering calculations, units, rounding, edge cases, persistence, and date boundaries.

### Out of Scope
- Automatic hardware BLE GPS pairing for stationary exercise bikes.
- Full text reading reader integration.
- Public social leaderboards.

---

## I. Requirement Traceability Matrix

| Requirement | Description | Acceptance Criteria | Planned Test |
|---|---|---|---|
| **FR-001** | `GoalProgressEntry` schema | **AC-001**, **AC-011** | `goal-progress.test.ts` schema tests |
| **FR-002** | Unit-aware quick-add buttons | **AC-001**, **AC-002**, **AC-003** | UI & calculator unit tests |
| **FR-003** | Custom numeric input with units | **AC-001**, **AC-002** | Input validation tests |
| **FR-004** | Undo and entry deletion | **AC-008** | Repository undo/delete tests |
| **FR-005** | Minute calculation engine | **AC-004**, **AC-005** | Calculator engine unit tests |
| **FR-006** | Over-target preservation & 100% cap | **AC-006** | Target overflow calculation tests |
| **FR-007** | Fractional hours normalization | **AC-005** | 8.5h (510m) conversion tests |
| **FR-008** | Analytics calculator integration | **AC-009** | `analytics-calculator.test.ts` |
| **FR-009** | Today timeline collapsible quick tracker | **AC-007** | Timeline goal tracker tests |
| **FR-010** | Offline repository & Firestore sync | **AC-011** | Repository sync & persistence tests |
| **FR-011** | Backup & restore upgrade | **AC-011** | Backup export/import tests |
| **FR-012** | Zero double-counting guarantee | **AC-010** | Integration & deficit tests |
