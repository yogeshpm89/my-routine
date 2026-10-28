# Feature-015: Implementation Report — Flexible Routine Block Replacement

## 1. Task Metadata

- **Task ID**: `feature-015-flexible-routine-block-replacement`
- **Task Title**: Flexible Routine Block Replacement & Schedule Adaptation
- **Task Type**: New Feature & Architectural Enhancement
- **Source Issue**: [GitHub Issue #15: My Routine — Flexible Routine Block Replacement](https://github.com/yogeshpm89/my-routine/issues/15)
- **Branch**: `feature/issue-15-flexible-routine-block-replacement`
- **Implementation Date**: 2026-10-28
- **Status**: **COMPLETE & VERIFIED**

---

## 2. Executive Summary

This feature delivers a first-class, non-destructive **Flexible Routine Block Replacement** capability to *My Routine*. Users encountering interruptions (emergencies, urgent meetings, personal priorities) can now replace an individual routine block with an activity from their routine library or an ad-hoc temporary activity.

Key accomplishments:
1. **Preserved History & Transparency**: The original routine block is preserved as `status: 'replaced'` with reason and snapshot, while the replacement occurrence is displayed with active controls and badge attribution.
2. **Strict Life Goal Isolation**: Completion of replacement activities credits only their explicitly assigned Life Goal (or none), preventing erroneous cross-goal credit to the original routine's Life Goal.
3. **Partial Work Logging**: Partial duration spent before an interruption is preserved on the original block and credited to the original routine's Life Goal.
4. **Rescheduling**: Users can reschedule the interrupted block to another time slot on the same day.
5. **Real-time Overlap Warnings**: Live conflict detection alerts the user if their selected replacement slot collides with existing routine activities.
6. **Notification Alignment**: Scheduled reminders for replaced blocks are removed; replacement reminders are scheduled.
7. **Zero Impact on Future Routine Schedules**: One-time replacements default to today only (`scope: 'this_occurrence'`), without creating unnecessary permanent recurring templates.

---

## 3. Implementation Progress by Phase

- [x] **Phase 1**: Core Data Models & Occurrence Generation
  - Extended `ActivityStatusSchema` with `'replaced'` and `'rescheduled'`.
  - Added `ReplacementActivityDetailsSchema` and `RescheduleDetailsSchema`.
  - Extended `OccurrenceOverrideSchema` and `ActivityOccurrence` to support structured replacement metadata.
  - Enhanced `generateDailyOccurrences` to emit original replaced occurrences (dimmed, status `replaced`), replacement occurrences (`isReplacement: true`), and rescheduled occurrences (`isRescheduled: true`).
- [x] **Phase 2**: Life Goal Tracking & Isolation
  - Updated `LifeGoalRepository.syncCompletedRoutineToLifeGoals` to accept `{ isReplacement, linkedGoalId, replacesTemplateId, isReplaced }`.
  - Isolated progress so replacement activities never inadvertently credit the original routine's Life Goal.
  - Added support for crediting partial duration before replacement to the original goal.
- [x] **Phase 3**: Notifications & Analytics Reconciliation
  - Updated `NotificationManager.compute72HourSchedule` to exclude replaced occurrences and schedule notifications for replacement occurrences.
  - Updated `AnalyticsCalculator` to count `'replaced'` and `'rescheduled'` statuses without double-counting planned duration.
- [x] **Phase 4**: Replace Routine Block Modal Component (`ReplaceBlockDialog`)
  - Created `ReplaceBlockDialog` (`src/components/routine/replace-block-dialog.tsx`) with Library selector, Ad-hoc temporary task creator, Time slot selector with live conflict detection, Partial work recorder, Reschedule options, Preset & custom reasons, and Life Goal link selector.
- [x] **Phase 5**: Timeline & Current Activity Card UI Integration
  - Added "Replace" (`ArrowLeftRight`) action buttons in `ActivityTimelineItem` and `CurrentActivityCard`.
  - Added `isReplaced`, `isReplacement`, and `isRescheduled` badges and subtitles.
  - Disabled completion toggle on replaced blocks.
  - Wired dialog and state handlers in `src/app/page.tsx`.
- [x] **Phase 6**: Verification, End-to-End Tests & Build Validation
  - Created dedicated test suite `src/lib/routine-replacement.test.ts` (9 tests).
  - Verified all 27 test files (227 tests) pass cleanly.
  - Validated clean Next.js production build with 0 TypeScript errors.

---

## 4. Files Created and Modified

| File | Action | Purpose |
|---|---|---|
| [`src/types/routine.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/types/routine.ts) | Modified | Added `'replaced'` and `'rescheduled'` statuses, `ReplacementActivityDetailsSchema`, `RescheduleDetailsSchema`, and extended `OccurrenceOverrideSchema` and `ActivityOccurrence`. |
| [`src/lib/occurrence-generator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/occurrence-generator.ts) | Modified | Synthesized original replaced block, replacement occurrence, and rescheduled occurrence while preserving planned details. |
| [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts) | Modified | Added `options` to `syncCompletedRoutineToLifeGoals` for strict goal isolation and skipping replaced blocks. |
| [`src/lib/notifications/notification-manager.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/notifications/notification-manager.ts) | Modified | Filtered out replaced occurrences in `compute72HourSchedule` to prevent duplicate alerts. |
| [`src/lib/analytics/analytics-calculator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/analytics/analytics-calculator.ts) | Modified | Added `replaced` status counting and excluded replacement occurrences from planned minutes sum to avoid double counting. |
| [`src/components/routine/replace-block-dialog.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/replace-block-dialog.tsx) | Created | Full replacement dialog component with Library/Ad-hoc mode, conflict warning, reschedule, partial work, and goal linking. |
| [`src/components/routine/activity-timeline-item.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/activity-timeline-item.tsx) | Modified | Added Replace button, replaced/replacement/rescheduled badges, dimmed card styling, and disabled toggle on replaced blocks. |
| [`src/components/routine/current-activity-card.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/current-activity-card.tsx) | Modified | Added `btn-replace-current` button with `ArrowLeftRight` icon. |
| [`src/components/routine/today-timeline.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/today-timeline.tsx) | Modified | Passed `onOpenReplace` prop down to `ActivityTimelineItem`. |
| [`src/app/page.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/page.tsx) | Modified | Wired `ReplaceBlockDialog` modal state, `handleConfirmReplacement` handler, goal option pass-through, and notification reconciliation. |
| [`src/lib/routine-replacement.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/routine-replacement.test.ts) | Created | Comprehensive unit test suite covering occurrence synthesis, life goal isolation, notifications, and analytics. |
| [`docs/tasks/feature-015-flexible-routine-block-replacement/approval.md`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/docs/tasks/feature-015-flexible-routine-block-replacement/approval.md) | Modified | Updated approval and completion status. |
| [`docs/tasks/feature-015-flexible-routine-block-replacement/README.md`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/docs/tasks/feature-015-flexible-routine-block-replacement/README.md) | Modified | Updated status and traceability matrix. |

---

## 5. Acceptance Criteria Verification

| ID | Criteria | Result | Evidence |
|---|---|---|---|
| **AC-001** | Replace button visible on planned routine blocks | **PASS** | Button with `ArrowLeftRight` icon rendered on both `ActivityTimelineItem` and `CurrentActivityCard`. |
| **AC-002** | Replacing a block preserves planned activity details | **PASS** | Original block is synthesized with status `'replaced'`, preserving planned title, category, and times with reason notes. Verified in `routine-replacement.test.ts`. |
| **AC-003** | Ad-hoc replacement without creating permanent template | **PASS** | Ad-hoc replacements are saved as date-scoped `OccurrenceOverride` objects; no new template added to routine templates repository unless explicit future scope chosen. |
| **AC-004** | Goal isolation: replacement does not credit original goal | **PASS** | Verified in `routine-replacement.test.ts`: completing replacement activity with separate or no goal link leaves original goal untouched (50 sessions unchanged). |
| **AC-005** | Partial duration logged before replacement is credited | **PASS** | Verified in `routine-replacement.test.ts`: logging 45m partial work updates status to `partial` and credits original goal. |
| **AC-006** | Rescheduling interrupted activity creates a new occurrence | **PASS** | Verified in `routine-replacement.test.ts`: specifying `rescheduledTo: { startTime: '15:00', endTime: '17:00' }` generates rescheduled occurrence with `rescheduledFrom` metadata. |
| **AC-007** | Overlap conflicts flagged with warning before saving | **PASS** | Real-time conflict detector in `ReplaceBlockDialog` checks other occurrences for overlaps and displays warning badge. |
| **AC-008** | Notification reconciliation cancels replaced reminders | **PASS** | Verified in `routine-replacement.test.ts`: `NotificationManager.compute72HourSchedule` skips replaced block and schedules replacement reminders. |

---

## 6. Test and Build Verification

### 6.1 Vitest Suite
```
 RUN  v4.1.12 C:/Users/YogeshMurdeshwar/projects/self/my-routine

 ✓ src/lib/routine-replacement.test.ts (9 tests)
 ✓ src/lib/goals/goal-progress.test.ts (20 tests)
 ✓ src/lib/repositories/skip-complete-routine.test.ts (3 tests)
 ✓ src/lib/steps/task-steps.test.ts (4 tests)
 ✓ src/lib/repositories/activity-comments.test.ts (7 tests)
 ✓ src/lib/mobile-revalidation.test.ts (5 tests)
 ✓ src/lib/notifications/notification-reliability.test.ts (12 tests)
 ✓ src/lib/sync/sync-engine.test.ts (3 tests)
 ✓ src/lib/repositories/routine-archival-regression.test.ts (12 tests)
 ✓ src/lib/integration.test.ts (9 tests)
 ✓ src/lib/ai/ai-actions.test.ts (14 tests)
 ✓ src/lib/repositories/life-goals.test.ts (27 tests)
 ✓ src/components/analytics/goal-progress-card.test.tsx (4 tests)
 ✓ src/lib/notifications/notification-manager.test.ts (4 tests)
 ✓ src/lib/templates/day-template.test.ts (18 tests)
 ✓ src/components/routine/today-timeline-mobile.test.tsx (2 tests)
 ✓ src/components/speedometer/speedometer-modal.test.tsx (7 tests)
 ✓ src/lib/speedometer/speedometer-utils.test.ts (16 tests)
 ✓ src/lib/analytics/analytics-calculator.test.ts (4 tests)
 ✓ src/lib/updates/update-manager.test.ts (5 tests)
 ✓ src/lib/occurrence-generator.test.ts (5 tests)
 ✓ src/lib/activity-styles.test.ts (3 tests)
 ✓ src/lib/holidays/holiday-service.test.ts (4 tests)
 ...

 Test Files  27 passed (27)
      Tests  227 passed (227)
   Duration  13.92s
```

### 6.2 Next.js Production Build
```
> my-routine@1.6.0 build
> next build

▲ Next.js 16.4.1 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 55ms
- Cache Components enabled
- Partial Prefetching enabled

  Creating an optimized production build ...
✓ Compiled successfully in 1861ms
  Running TypeScript ...
  Finished TypeScript in 7.2s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (7/7) in 2.3s
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /forgot-password
├ ○ /login
└ ○ /register

○  (Static)  prerendered as static content
```

---

## 7. Follow-up UI Refinements

1. **Daily Routine Cards Checklist Default Collapsed**:
   - Updated [`src/components/routine/activity-timeline-item.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/activity-timeline-item.tsx): Checklist initialized with `useState(false)` so sub-steps are cleanly collapsed by default.
   - Updated [`src/components/routine/current-activity-card.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/current-activity-card.tsx): Added collapsible sub-steps toggle button initialized to collapsed (`false`) for visual consistency with timeline cards.
2. **Life Goal Card Roadmap Default Collapsed**:
   - Updated [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx): Changed phase collapse default to `true` (collapsed) so all roadmap phases start neatly collapsed on card view. Updated phase toggling and "Expand All / Collapse All" button to coordinate with the default collapsed state.

---

## 8. Conclusion

Feature #15: Flexible Routine Block Replacement and the follow-up UI refinements are fully implemented, thoroughly tested, and verified across all functional requirements, non-functional requirements, and acceptance criteria.
