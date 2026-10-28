# Feature-015: Flexible Routine Block Replacement

## 1. Task Metadata

- **Task ID**: `feature-015-flexible-routine-block-replacement`
- **Task Title**: Flexible Routine Block Replacement & Schedule Adaptation
- **Task Type**: New Feature & Architectural Enhancement
- **Source Issue**: [GitHub Issue #15: My Routine — Flexible Routine Block Replacement](https://github.com/yogeshpm89/my-routine/issues/15)
- **Target Branch**: `feature/issue-15-flexible-routine-block-replacement`
- **Documentation Date**: 2026-10-28
- **Current Stage**: Phase 9 — Implementation Complete, Verified, & Documented
- **Approval Status**: **APPROVED (2026-10-28)**
- **Task Status**: **COMPLETED & VERIFIED**

---

## 2. Problem Statement

In daily life, plans inevitably encounter unexpected interruptions: urgent work emergencies, unscheduled meetings, family responsibilities, health priorities, or sudden travel.

In **My Routine**, users currently establish recurring routine blocks (such as *Reading* 3:00 PM–4:00 PM tied to a reading life goal). When an interruption occurs:
1. The user cannot substitute or replace the routine block for today without either modifying the entire recurring template or editing the title destructively.
2. If they change the title through the standard editor override, the system loses what was originally planned (*Reading*) vs what actually happened (*Project Work*).
3. If they mark the modified occurrence completed, completion duration is mistakenly credited to the original template's linked Life Goal (crediting 60 minutes of Reading for Project Work).
4. If the user started the activity (e.g., read for 10 minutes) before the interruption arose, there is no way to record the 10 minutes of reading while allocating the remaining 50 minutes to the replacement task.
5. The user cannot easily reschedule the interrupted block to another available time slot later in the day without creating a separate new routine block from scratch.

Users need a first-class **Flexible Routine Block Replacement** feature that allows them to quickly adapt their schedule when unexpected priorities arise, while preserving planned routines, recording actual activities, maintaining accurate goal tracking, preventing duplicate progress, and updating notification schedules.

---

## 3. Current Behavior (Verified from Codebase Evidence)

1. **Occurrence Overrides**:
   - In [`src/types/routine.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/types/routine.ts#L97-L113), `OccurrenceOverrideSchema` supports `modifiedStartTime`, `modifiedEndTime`, `modifiedTitle`, `isCancelled`, and `isPostponed`.
   - When an override has `modifiedTitle`, [`generateDailyOccurrences`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/occurrence-generator.ts#L86-L120) overwrites `occ.title`. The original planned title and category are discarded for that day's occurrence.
2. **Activity Lifecycle Statuses**:
   - In [`src/types/routine.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/types/routine.ts#L115-L123), `ActivityStatusSchema` only supports `'pending'`, `'in_progress'`, `'completed'`, `'partial'`, `'skipped'`, and `'postponed'`.
   - There is no `'replaced'` or `'rescheduled'` status.
3. **Goal Auto-Sync on Completion**:
   - In [`src/app/page.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/page.tsx#L1130-L1156), when any occurrence status transitions to `'completed'`, `LifeGoalRepository.syncCompletedRoutineToLifeGoals` searches for life goals matching `occurrence.templateId`.
   - Because `occurrence.templateId` remains the original routine's template ID, completing a replaced block credits progress to the original routine's linked goal, corrupting goal metrics.
4. **No UI Action for Replacement**:
   - In [`src/components/routine/activity-timeline-item.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/activity-timeline-item.tsx) and [`src/components/routine/current-activity-card.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/current-activity-card.tsx), users only have options to Play, Skip, Complete, Edit Template/Occurrence, Duplicate, or Delete.
   - There is no "Replace activity", "Change this block", or "Adapt routine" action.
5. **Partial Work Discarded**:
   - If a routine activity was underway (e.g. 10 minutes completed) and is then changed, the partial duration is lost or must be manually edited in JSON completion notes.
6. **Analytics Planned vs Actual**:
   - In [`src/lib/analytics/analytics-calculator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/analytics/analytics-calculator.ts#L66-L100), occurrences do not track planned vs replacement activities, and status counts do not report replaced blocks.

---

## 4. Expected Behavior

1. **Dedicated Replace Action**:
   - Routine blocks in the Today timeline and Current Activity card provide a clear "Replace block" / "Adapt routine" action (`ArrowLeftRight` icon).
2. **Replacement Configuration Dialog**:
   - Selecting "Replace block" opens a modal enabling the user to:
     - Review the original planned block (Title, Category, Time Slot, Linked Goal).
     - Select a replacement activity from the existing Routine Library (templates) OR create a one-time temporary activity (Title, Category, Color).
     - Keep the existing time slot or customize start/end times.
     - Record partial work already completed for the original activity (if started).
     - Choose what happens to the original activity: Mark Replaced (skip remainder) OR Reschedule to another time today.
     - Optionally provide a reason for the replacement (e.g., "Urgent client incident", "Doctor appointment", "Emergency errand").
     - Choose a Life Goal to associate with the replacement (or leave unlinked). The original Life Goal is never automatically attributed.
     - Select scope: "This occurrence only" (default), "This and future occurrences", or "Update routine template".
3. **Preservation of Planned vs Actual**:
   - The UI clearly distinguishes what was originally planned from what actually took place:
     - The original block reflects status `replaced` (or `partial` with partial duration noted).
     - The replacement block is visibly displayed on the timeline with a `Replaced` / `Replacement` badge referencing the original activity.
4. **Accurate Goal Attribution**:
   - The original activity's goal only receives progress for actual verified minutes performed (if partial work was logged), and 0 minutes if entirely replaced.
   - The replacement activity's progress is credited exclusively to its own chosen Life Goal (if associated).
5. **Conflict Handling**:
   - If the replacement time slot overlaps with another scheduled routine block, the conflict is displayed with non-destructive resolution options (adjust time or shift).
6. **Notification Re-alignment**:
   - Scheduled notifications for the original occurrence are cancelled or updated.
   - Notifications for the replacement activity are scheduled according to user preferences within the rolling 72-hour window.
7. **Offline-First & Firestore Synchronization**:
   - Replacements work seamlessly offline with local persistence and sync via `MutationQueue` when online.

---

## 5. Functional Requirements

- **FR-001: Extended Activity Status Lifecycle**
  Extend `ActivityStatusSchema` in [`src/types/routine.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/types/routine.ts) to include `'replaced'` and `'rescheduled'`.
- **FR-002: Extended Occurrence Override Model**
  Update `OccurrenceOverrideSchema` to include structured replacement metadata:
  - `isReplaced?: boolean`
  - `replacementActivity?: { id: string; title: string; category: ActivityCategory; startTime: string; endTime: string; durationMinutes: number; reason?: string; linkedGoalId?: string; isTemporary?: boolean; color?: string }`
  - `originalActivitySnapshot?: { title: string; category: ActivityCategory; startTime: string; endTime: string; durationMinutes: number; goalId?: string }`
  - `partialDurationMinutes?: number`
  - `rescheduledTo?: { date: string; startTime: string; endTime: string }`
- **FR-003: Occurrence Generator Support for Replacements**
  Update `generateDailyOccurrences` in [`src/lib/occurrence-generator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/occurrence-generator.ts):
  - When an override specifies `isReplaced`, generate both:
    1. The original planned occurrence with status `'replaced'`, `isReplaced: true`, preserving original title, planned duration, and reason.
    2. The replacement occurrence with `isReplacement: true`, `replacesTitle: template.title`, `replacesTemplateId: template.id`, start/end times, and category.
    3. If `rescheduledTo` is specified, generate the rescheduled occurrence at the target time.
- **FR-004: Interactive Replace Routine Block Dialog**
  Create `ReplaceBlockDialog` (`src/components/routine/replace-block-dialog.tsx`) allowing users to configure all replacement scenarios with real-time conflict detection preview.
- **FR-005: Timeline & Card Integration**
  Add the Replace Block action button to:
  - [`src/components/routine/activity-timeline-item.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/activity-timeline-item.tsx)
  - [`src/components/routine/current-activity-card.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/current-activity-card.tsx)
  Render distinct visual treatments for replaced and replacement occurrences.
- **FR-006: Life Goal Isolation & Accurate Sync**
  Update `LifeGoalRepository.syncCompletedRoutineToLifeGoals` in [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts):
  - Ignore replaced original blocks (duration 0).
  - For replacement occurrences, sync only to the replacement's explicitly chosen `linkedGoalId`, preventing accidental attribution to the original routine's life goal.
  - Record partial progress correctly when partial duration is specified.
- **FR-007: Notification Re-alignment**
  Update `NotificationManager.compute72HourSchedule` in [`src/lib/notifications/notification-manager.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/notifications/notification-manager.ts) to cancel/omit notifications for replaced blocks and schedule notifications for replacement occurrences.
- **FR-008: Analytics Planned vs Actual**
  Update `AnalyticsCalculator` in [`src/lib/analytics/analytics-calculator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/analytics/analytics-calculator.ts) to track `replaced` in `statusCounts` and calculate actual minutes accurately (partial duration + replacement duration).

---

## 6. Non-Functional Requirements

- **NFR-001 (Data Integrity)**: Replacing a block for today must never modify or corrupt recurring routine templates, weekly planners, or future occurrences unless the user explicitly chooses recurring scope.
- **NFR-002 (Offline Resilience)**: Block replacement must execute instantly offline in `localStorage` and queue remote mutations gracefully in `MutationQueue`.
- **NFR-003 (Backward Compatibility)**: Existing saved overrides without replacement fields must continue to function without validation errors or schema migration failures.
- **NFR-004 (Performance)**: Occurrence generation with replacements must remain fast (<10ms for daily schedules).
- **NFR-005 (Mobile Usability)**: The replacement dialog and timeline badges must be fully touch-friendly, responsive, and ergonomic on mobile viewports.
- **NFR-006 (Timezone Consistency)**: All time calculations must continue using `'Asia/Kolkata'` consistently.

---

## 7. Acceptance Criteria

- **AC-001: Replacement Dialog Launch**
  - *Given* an active routine block on the Today timeline,
  - *When* the user clicks the "Replace block" button,
  - *Then* the `ReplaceBlockDialog` opens displaying the planned activity's details.
- **AC-002: Same-Slot Replacement with Library Activity**
  - *Given* the replacement dialog is open for "Reading" (3:00 PM–4:00 PM),
  - *When* the user selects "Project Work" from the library, leaves the time slot unchanged, enters reason "Urgent client issue", and confirms,
  - *Then* "Reading" is marked as `replaced`, "Project Work" is scheduled for 3:00 PM–4:00 PM, and the replacement reason is displayed.
- **AC-003: Temporary Activity Creation**
  - *Given* the replacement dialog is open,
  - *When* the user enters a custom title "Emergency Dentist" and category "health",
  - *Then* the replacement is scheduled without requiring a permanent routine template to be created.
- **AC-004: Life Goal Attribution Isolation**
  - *Given* "Reading" is linked to Life Goal "Read 30 books",
  - *When* "Reading" is replaced by "Project Work" (linked to "Complete Project" or no goal) and "Project Work" is completed,
  - *Then* 0 minutes are credited to "Read 30 books", and the completed duration is credited only to "Complete Project".
- **AC-005: Partial Work Preservation**
  - *Given* the user started "Reading" and spent 15 minutes before replacing it,
  - *When* the user specifies 15 minutes of partial work in the replacement dialog,
  - *Then* 15 minutes are recorded in Reading's log and goal progress, while the replacement receives the remaining duration.
- **AC-006: Rescheduling the Interrupted Block**
  - *Given* the user wants to reschedule "Reading" instead of skipping it,
  - *When* the user selects "Reschedule to later today" and enters 8:00 PM–9:00 PM,
  - *Then* the replacement block runs at 3:00 PM, and a rescheduled "Reading" block appears at 8:00 PM.
- **AC-007: Conflict Detection Warning**
  - *Given* the user inputs a replacement time slot that overlaps with an existing fixed or flexible block,
  - *Then* the dialog highlights the collision with warning details and suggested adjustments before saving.
- **AC-008: Notification Synchronization**
  - *Given* notifications were scheduled for "Reading" at 3:00 PM,
  - *When* "Reading" is replaced by "Project Work" at 3:00 PM,
  - *Then* the notification for "Reading" is cancelled, and a notification for "Project Work" is scheduled.

---

## 8. Scope

### In Scope
1. Extension of `ActivityStatusSchema` and `OccurrenceOverrideSchema` with replacement fields.
2. Occurrence generation engine updates for planned vs actual occurrences.
3. Interactive `ReplaceBlockDialog` supporting library selection, temporary activities, partial work, rescheduling, reasons, and goal selection.
4. Timeline and Current Activity card UI updates with replace buttons and visual badges.
5. Life Goal completion sync isolation preventing unwanted cross-goal attribution.
6. Real-time conflict validation in replacement dialog.
7. 72-hour notification reconciliation for replaced and replacement blocks.
8. Analytics calculator updates for replaced statuses and actual duration accuracy.
9. Unit and integration tests covering all replacement scenarios.

### Out of Scope
1. AI automatic schedule auto-negotiation (future enhancement).
2. Recurring replacement across multi-week calendar views beyond current scope options.
3. Voice-activated block replacement via audio transcription.

---

## 9. Dependencies and Open Questions

### Dependencies
- Existing `OccurrenceOverride` model and repository.
- Existing `LifeGoalRepository` activity tracking and completion sync.
- Existing `NotificationManager` 72-hour rolling schedule calculator.
- Existing `ConflictDetector` pairwise time overlap utilities.

### Open Questions for User Approval
1. **Visual Display Preference**: Should replaced original blocks remain visible on the timeline in a dimmed/strikethrough state with an option to toggle them off, or should they be collapsed by default into an expandable "1 replaced activity" section?
   *(Recommendation: Keep visible with a dimmed card, "Replaced" badge, and link to the replacement activity for complete transparency).*
2. **Notification Behavior for Rescheduled Blocks**: If an activity is rescheduled to later today (e.g. 8:00 PM), should it inherit the original block's notification rules (advance/start alerts)?
   *(Recommendation: Yes, automatically apply the original block's notification rules to the new rescheduled time slot).*

---

## 10. Requirement Traceability Matrix

| Requirement | Acceptance Criteria | Planned Components / Files | Test Coverage |
|---|---|---|---|
| FR-001 (Status lifecycle) | AC-002, AC-005 | `src/types/routine.ts` | `src/lib/occurrence-generator.test.ts` |
| FR-002 (Override schema) | AC-002, AC-003, AC-006 | `src/types/routine.ts` | `src/lib/repositories/override-replacement.test.ts` |
| FR-003 (Occurrence generator) | AC-002, AC-005, AC-006 | `src/lib/occurrence-generator.ts` | `src/lib/occurrence-generator.test.ts` |
| FR-004 (ReplaceBlockDialog) | AC-001, AC-002, AC-003, AC-007 | `src/components/routine/replace-block-dialog.tsx` | `src/components/routine/replace-block-dialog.test.tsx` |
| FR-005 (UI Integration) | AC-001, AC-002 | `activity-timeline-item.tsx`, `current-activity-card.tsx` | `src/components/routine/today-timeline-mobile.test.tsx` |
| FR-006 (Goal Isolation) | AC-004, AC-005 | `src/lib/repositories/life-goal-repository.ts` | `src/lib/repositories/life-goals.test.ts` |
| FR-007 (Notifications) | AC-008 | `src/lib/notifications/notification-manager.ts` | `src/lib/notifications/notification-manager.test.ts` |
| FR-008 (Analytics) | AC-002, AC-005 | `src/lib/analytics/analytics-calculator.ts` | `src/lib/analytics/analytics-calculator.test.ts` |
