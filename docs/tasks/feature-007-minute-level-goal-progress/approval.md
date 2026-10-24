# Approval Request: Improve Goal Progress Tracking with Minute-Level & Unit-Based Updates

## 1. Task Summary

- **Task ID**: `feature-007-minute-level-goal-progress`
- **Task Title**: Improve Goal Progress Tracking with Minute-Level & Unit-Based Updates
- **Source Issue**: [GitHub Issue #7](https://github.com/yogeshpm89/my-routine/issues/7)
- **Target Branch**: `feature/issue-7-minute-level-goal-progress`
- **Starting Version**: `1.3.0` (`versionCode: 5`)
- **Target Version**: `1.4.0` (`versionCode: 6`)
- **Documentation Date**: 2026-10-24
- **Current Status**: **AWAITING USER APPROVAL**

---

## 2. Problem Being Solved

Goal progress tracking in **My Routine** is currently tied solely to scheduled routine blocks (`ActivityOccurrence`). Users cannot record progress toward their 9 daily goals in small, incremental chunks (such as minutes, kilometers, chapters, or course topics) as they accomplish tasks throughout the day. In addition, goals without scheduled routine blocks (such as *Coursera*, which has `templateIds: []`) remain stuck at 0% with permanent deficit notices. Users need a fast, intuitive way to record progress directly from both `AnalyticsTab` and a collapsible Daily Goals bar in `TodayTimeline`, with immediate calculation of completion percentages, remaining minutes, progress bars, and audit history without double-counting routine completion records.

---

## 3. User Design Decisions Recorded

Based on user feedback:
1. **Minimum Level & Unit Tracking per Goal**:
   - **Cycling & Exercise**: Trackable by kilometers. Users can add a number directly (e.g. typing `15` for 15 km) or tap quick actions (`+1 km`, `+5 km`, `+10 km`, `+15 km`). Converted to normalized routine duration (3 min/km pace) toward the 120m daily target while preserving distance logged.
   - **Book Reading & Self-Learning**: Trackable at the chapter level (`+1 ch`, `+5 ch`) as well as minutes.
   - **Courses (Coursera)**: Trackable at the topic and module level (`+1 topic`, `+1 module`) as well as minutes.
   - **Time-Based Goals (Work, Meditation, Journalling, Power Nap)**: Trackable at the 1-minute minimum level (`+1 min`, `+5 min`, `+10 min`, `+15 min`, `+30 min`).
2. **Placement on Today View**:
   - Confirmed **Yes**: A collapsible "Daily Goals" bar (`TodayGoalQuickBar`) will be added to `TodayTimeline` right below the date navigation header, allowing one-tap goal tracking without leaving the schedule.

---

## 4. Expected Behavior

1. **Quick-Add Actions**:
   - Dynamic buttons customized to the goal's unit (km for cycling, chapters for reading, topics for courses, minutes for time).
   - Custom numeric input accepting any positive value in that unit with an optional note.
2. **Deterministic Minute-Level Calculation**:
   - `targetMinutes` = daily target duration (e.g. 510m for 8.5h work, 120m for cycling, 30m for reading/meditation/coursera).
   - `completedMinutes` = sum of valid progress entries (converted to minutes) and routine execution minutes for that goal on that date.
   - `remainingMinutes` = `Math.max(0, targetMinutes - completedMinutes)`.
   - `rawPercentage` = `(completedMinutes / targetMinutes) * 100`.
   - `displayPercentage` = `Math.min(100, Math.round(rawPercentage * 10) / 10)` (formatted to 1 decimal place).
3. **Over-Target Preservation**: When progress exceeds 100% (e.g. 35 min / 30 min target), the visual progress bar is capped at 100%, remaining minutes is 0, and the true accumulated duration and units (e.g. 15 km / 45m) are preserved and displayed.
4. **Zero Double-Counting**: Routine occurrences log duration via `ActivityLog`, while manual progress is tracked via `GoalProgressEntry`. The calculation engine aggregates them cleanly without duplicate accumulation.
5. **Instant UI Feedback & Undo**: Progress updates immediately on screen without page reloads, accompanied by a brief confirmation indicator (e.g. `+15 km recorded (45m)`). Users can undo the most recent entry or delete specific entries from today's history.
6. **Persistence & Sync**: Progress entries persist in offline `localStorage` and synchronize to Cloud Firestore under `users/{userId}/goal_progress/{id}` when online. Backups export and restore goal progress with backward compatibility.

---

## 5. Main Files Expected to Change

| File Path | Action | Description |
|---|---|---|
| `src/types/goal-progress.ts` | **Create** | Zod schemas and TypeScript types for `GoalProgressEntry`, `GoalTrackingUnit`, and `CalculatedGoalProgress`. |
| `src/lib/goals/goal-progress-calculator.ts` | **Create** | Calculation engine for minute-level progress, unit conversion (km, chapters, topics), 1-decimal rounding, and aggregation. |
| `src/lib/repositories/goal-progress-repository.ts` | **Create** | Local storage cache + Firestore sync under `users/{userId}/goal_progress`. |
| `src/lib/sync/mutation-queue.ts` | **Modify** | Add `'goal_progress'` to `SyncCollection`. |
| `src/lib/sync/backup-service.ts` | **Modify** | Include `goalProgress` in backup export/import with backward-compatibility. |
| `src/lib/analytics/analytics-calculator.ts` | **Modify** | Incorporate goal progress entries into daily and weekly summaries, adherence rates, and deficits. |
| `src/components/analytics/goal-progress-card.tsx` | **Create** | Interactive goal progress card with unit-specific quick-add buttons (+15km, +1ch, +1 topic, +5m), custom input, undo, and history. |
| `src/components/analytics/analytics-tab.tsx` | **Modify** | Render new interactive `GoalProgressCard` components in Daily Goal Targets. |
| `src/components/routine/today-goal-quick-bar.tsx` | **Create** | Collapsible quick-progress widget for the Today routine timeline. |
| `src/components/routine/today-timeline.tsx` | **Modify** | Embed `TodayGoalQuickBar` allowing one-tap goal tracking from the schedule. |
| `src/app/page.tsx` | **Modify** | Coordinate state for `goalProgress`, load from repository, and wire handlers. |
| `src/lib/goals/goal-progress.test.ts` | **Create** | Comprehensive Vitest suite covering all calculation, unit conversion, edge cases, and persistence scenarios. |
| `package.json`, `version.json`, `android/app/build.gradle`, `public/download/index.html` | **Modify** | Bump version to `1.4.0` (`versionCode: 6`). |

---

## 6. Acceptance Criteria Checklist

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

## 7. Approval Checklist

Before implementation begins, please confirm:
- [x] The unit-based tracking (km for cycling, chapters for reading, topics for courses, minutes for time) and TodayTimeline collapsible bar are accurate.
- [x] The proposed data model and calculation engine are sound.
- [x] The file-by-file implementation plan and phased breakdown are acceptable.
- [x] The testing strategy and risk mitigations are sufficient.

---

## 8. Approval Record

- **Approval Date & Time**: 2026-10-24T08:38:19+05:30
- **Approved By**: User (@yogeshpm89)
- **Branch**: `feature/issue-7-minute-level-goal-progress`
- **Notes / Directives**: Plan approved with minimum level unit tracking (km for cycling, chapters for reading, topics/modules for courses, minutes for time) and collapsible Daily Goals bar in TodayTimeline. Increment version per incremental changes.
- **Status**: **APPROVED**
