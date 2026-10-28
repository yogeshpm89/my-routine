# Feature-015: Approval Document — Flexible Routine Block Replacement

## 1. Task Summary

- **Task ID**: `feature-015-flexible-routine-block-replacement`
- **Task Title**: Flexible Routine Block Replacement & Schedule Adaptation
- **Task Type**: New Feature & Architectural Enhancement
- **Source Issue**: [GitHub Issue #15: My Routine — Flexible Routine Block Replacement](https://github.com/yogeshpm89/my-routine/issues/15)
- **Target Branch**: `feature/issue-15-flexible-routine-block-replacement`
- **Date**: 2026-10-28

---

## 2. Problem Being Solved

When unexpected priorities, urgent meetings, personal emergencies, or priority shifts disrupt the planned routine, users currently cannot adapt their schedule without destructively editing recurring templates or losing planned routine records. Furthermore, completing a modified block incorrectly attributes progress to the original routine's Life Goal (e.g. 60 minutes of Reading credited for Project Work), and partial work performed before an interruption cannot be tracked.

---

## 3. Expected Behavior

1. **Quick Action**: Users can click "Replace block" (`ArrowLeftRight`) directly from any routine block on the timeline or current activity card.
2. **Flexible Adaptation**: In a dedicated dialog, users can substitute the interrupted block with an existing Routine Library activity or create an ad-hoc temporary activity for today without creating unwanted permanent templates.
3. **Time Adjustment & Rescheduling**: Users can keep the same time slot, adjust times, record partial work already performed on the original block, or reschedule the original activity to later in the day.
4. **Planned vs Actual Transparency**: The UI clearly displays what was originally planned (*Reading 3:00–4:00 PM [Replaced]*) and what actually happened (*Project Work 3:00–4:00 PM [Replacement]*), with optional replacement reasons.
5. **Goal Tracking Isolation**: The original goal is never falsely credited for replacement work. Completed replacement work only credits its own chosen goal.
6. **Notification Alignment**: Replaced alerts are removed; replacement alerts are scheduled.
7. **Zero Impact on Future Days**: One-time replacements default to today only.

---

## 4. Proposed Solution

1. Extend `ActivityStatusSchema` to include `'replaced'` and `'rescheduled'`.
2. Extend `OccurrenceOverrideSchema` and `ActivityOccurrence` to store structured replacement details (`replacementActivity`, `originalActivitySnapshot`, `partialDurationMinutes`, `rescheduledTo`, `isReplaced`, `isReplacement`).
3. Update `generateDailyOccurrences` to emit the original replaced block (with status `replaced`), the replacement occurrence, and any rescheduled occurrence.
4. Create `ReplaceBlockDialog` (`src/components/routine/replace-block-dialog.tsx`) with library selection, temporary activity creator, partial minutes recorder, reschedule picker, conflict preview, reason field, and goal selector.
5. Add "Replace" action buttons to `ActivityTimelineItem` and `CurrentActivityCard`.
6. Update `LifeGoalRepository.syncCompletedRoutineToLifeGoals` to isolate replacement activities from original goals.
7. Update `NotificationManager` and `AnalyticsCalculator` to handle replaced statuses properly.

---

## 5. Important Architectural Decisions

1. **Leveraging Existing Override Architecture**:
   Rather than creating an artificial second schedule system, we extend the existing `OccurrenceOverride` model. This preserves full offline-first persistence, backup/restore compatibility, and Firestore syncing without introducing parallel entities.
2. **Generating Distinct Occurrences for Planned vs Replacement**:
   `generateDailyOccurrences` yields both the replaced original block (marked with status `replaced`, rendered dimmed) and the active replacement block. This cleanly satisfies the requirement to distinguish planned vs actual activities across UI, logs, goals, and analytics.
3. **Goal Isolation Guarantee**:
   `LifeGoalRepository.syncCompletedRoutineToLifeGoals` explicitly checks `isReplacement`. If true, it never falls back to the original `templateId`, eliminating accidental cross-goal credit.

---

## 6. Main Files Expected to Change

| File | Action | Purpose |
|---|---|---|
| [`src/types/routine.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/types/routine.ts) | Modify | Add `'replaced'`, `'rescheduled'`, replacement schemas, and occurrence fields |
| [`src/lib/occurrence-generator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/occurrence-generator.ts) | Modify | Emit original replaced block, replacement occurrence, and rescheduled occurrence |
| [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts) | Modify | Goal progress isolation for replacements & partial work |
| [`src/lib/notifications/notification-manager.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/notifications/notification-manager.ts) | Modify | Cancel replaced notifications; schedule replacement notifications |
| [`src/lib/analytics/analytics-calculator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/analytics/analytics-calculator.ts) | Modify | Include `replaced` in status counts; compute actual minutes accurately |
| [`src/components/routine/replace-block-dialog.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/replace-block-dialog.tsx) | Create | Interactive replacement dialog |
| [`src/components/routine/activity-timeline-item.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/activity-timeline-item.tsx) | Modify | Action button (`ArrowLeftRight`) and badges for replaced/replacement |
| [`src/components/routine/current-activity-card.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/current-activity-card.tsx) | Modify | Replace button on current card |
| [`src/app/page.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/page.tsx) | Modify | Wire dialog state, handle confirm, trigger notification reconciliation |
| [`src/lib/repositories/override-replacement.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/override-replacement.test.ts) | Create | Dedicated test suite for replacement workflows |

---

## 7. Data Model or Persistence Implications

- **Local Storage**: Overrides and logs continue saving to `my_routine_overrides_<userId>` and `my_routine_logs_<userId>`.
- **Firestore Synchronization**: All added fields are standard JSON primitives; `cleanForFirestore` and `MutationQueue` handle them automatically.
- **Backward Compatibility**: Fully preserved; all new fields are optional.

---

## 8. Testing Strategy

1. **Unit Tests**:
   - `src/lib/occurrence-generator.test.ts`: Replacement occurrence synthesis, partial duration, and rescheduling.
   - `src/lib/repositories/override-replacement.test.ts`: End-to-end override saving, goal isolation, and status transitions.
   - `src/lib/notifications/notification-manager.test.ts`: Reminder cancellation and scheduling.
   - `src/lib/analytics/analytics-calculator.test.ts`: Planned vs actual metric calculation.
2. **Regression Testing**:
   - Full vitest run of all existing 26 test suites (218+ tests).
3. **Build Validation**:
   - `next build` validation ensuring clean TypeScript and linting.

---

## 9. Key Risks and Mitigations

- **Risk**: Accidental recurring template alteration.
  - **Mitigation**: The dialog defaults strictly to "This occurrence only" (`selectedDate`).
- **Risk**: Schedule overlap with fixed commitments.
  - **Mitigation**: Live conflict preview runs `isTimeOverlapping` against active day blocks before the user confirms.
- **Risk**: Goal metric corruption.
  - **Mitigation**: Unit tests specifically assert that completing a replacement block produces zero progress on the original routine's life goal.

---

## 10. Open Questions for User Decision

1. **Visual presentation of replaced original blocks**:
   - *Option A (Recommended)*: Keep the replaced original block on the timeline in a dimmed card with a `Replaced` badge and strike-through title, showing what actually replaced it.
   - *Option B*: Collapse replaced blocks into a compact collapsible section at the bottom of the timeline.
2. **Rescheduled block notification rules**:
   - *Option A (Recommended)*: Rescheduled blocks automatically copy the original routine's notification rules (advance/start alerts) adjusted to the new time.
   - *Option B*: Do not schedule notifications for rescheduled blocks unless manually re-enabled.

---

## 11. Acceptance Criteria

- **AC-001**: Clicking "Replace block" opens `ReplaceBlockDialog`.
- **AC-002**: Replacing with a library activity updates the schedule for today while preserving original plan records.
- **AC-003**: Creating an ad-hoc temporary replacement functions without creating permanent templates.
- **AC-004**: Completing a replacement activity does not credit the original routine's linked life goal.
- **AC-005**: Partial duration spent on an original activity before replacement is accurately credited.
- **AC-006**: Rescheduling an interrupted activity to later in the day creates a rescheduled occurrence at the target time.
- **AC-007**: Overlaps with existing blocks are flagged in the dialog before saving.
- **AC-008**: Notifications for replaced blocks are cancelled; replacement notifications are scheduled.

---

## 12. Scope Exclusions

- Automatic AI re-negotiation of schedules.
- Multi-week recurring pattern editor modifications.

---

## 13. Approval Checklist

- [x] Task requirements thoroughly understood from GitHub Issue #15.
- [x] Repository inspected and verified with zero premature application code edits.
- [x] `README.md`, `investigation.md`, `plan.md`, and `approval.md` created.
- [x] All 26 existing test suites verified passing (218 tests).
- [x] Explicit user approval received.

---

**Status: APPROVED — IMPLEMENTATION COMPLETE & VERIFIED**
**Approval Date**: 2026-10-28
**Approved Scope**: Full scope defined in plan.md (Models, Generator, Dialog, UI Badges, Goal Isolation, Notifications, Analytics)
**Completion Date**: 2026-10-28
**Build & Test Results**: 27/27 test files passed (227 tests), Next.js production build succeeded cleanly.
