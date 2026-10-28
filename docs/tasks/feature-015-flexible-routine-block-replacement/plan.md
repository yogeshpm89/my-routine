# Feature-015: Implementation Plan — Flexible Routine Block Replacement

## A. Proposed Solution

Implement a first-class **Flexible Routine Block Replacement** feature that allows users to adapt their scheduled routine when urgent priorities, meetings, emergencies, or life events interrupt the day.

The solution:
1. **Extends the Occurrence Override & Status Models**: Introduces `'replaced'` and `'rescheduled'` lifecycle statuses, accompanied by structured replacement metadata in `OccurrenceOverride`.
2. **Maintains Clear Distinction Between Planned & Actual**:
   - The original block is preserved on the daily schedule marked as `replaced`, showing what was originally planned, what replaced it, and the replacement reason.
   - The replacement activity appears on the schedule with its actual time slot, category, and its own completion lifecycle.
3. **Supports Multiple Replacement Scenarios**:
   - Replace in-place (same time slot) or with a modified start/end time.
   - Choose an existing activity from the Routine Library OR create a one-time temporary activity (without polluting the routine template library).
   - Record partial work already performed on the original activity (e.g., read for 10 minutes before interruption).
   - Reschedule the original activity to another available time today OR skip the remainder.
4. **Guarantees Isolated Goal Tracking**:
   - Replaced original activities are not credited as completed.
   - If partial work was recorded, only those exact minutes are credited to the original goal.
   - The replacement activity can optionally be associated with a different Life Goal, completely isolating metrics.
5. **Re-aligns Notifications & Analytics**:
   - Automatically cancels reminders for replaced blocks and schedules reminders for the replacement activity.
   - Updates analytics to account for replaced statuses and avoid double-counting durations.

---

## B. Architecture and Data Flow

### 1. Data Flow

```
[User clicks "Replace" on Activity]
       │
       ▼
[ReplaceBlockDialog renders]
  ├── Shows Original Plan (Title, Time, Goal)
  ├── Allows selection:
  │     ├── Option A: Select from Routine Library (Day Templates & Routines)
  │     └── Option B: Create One-time Temporary Activity
  ├── Allows time slot adjustment (with live conflict preview)
  ├── Allows recording partial work done on original (0 to planned duration)
  ├── Allows choosing original disposition: "Mark Replaced" vs "Reschedule to later today"
  ├── Allows Life Goal association for the replacement activity
  └── Allows replacement reason (e.g., "Urgent client issue", "Emergency errand")
       │
       ▼ [User Confirms Replacement]
[handleConfirmReplacement in page.tsx]
  ├── 1. Saves OccurrenceOverride:
  │      - isReplaced: true
  │      - replacementActivity: { title, category, startTime, endTime, linkedGoalId, reason, ... }
  │      - originalActivitySnapshot: { title, category, startTime, endTime, durationMinutes }
  │      - partialDurationMinutes: X
  │      - rescheduledTo: { date, startTime, endTime } (if rescheduled)
  ├── 2. If partialDurationMinutes > 0:
  │      - LogRepository.updateStatus(userId, date, templateId, 'partial', { actualDurationMinutes: X })
  │      - LifeGoalRepository.recordActivityForGoal(userId, originalGoalId, { durationMinutes: X, ... })
  │      Else:
  │      - LogRepository.updateStatus(userId, date, templateId, 'replaced')
  └── 3. Reconciles 72-Hour Notifications (NotificationManager.reconcileNotifications)
       │
       ▼
[generateDailyOccurrences re-evaluates]
  ├── Yields Original Occurrence:
  │      - status: 'replaced' (or 'partial')
  │      - isReplaced: true
  │      - replacement: replacementActivity
  ├── Yields Replacement Occurrence:
  │      - id: `replace_${templateId}_${date}`
  │      - isReplacement: true
  │      - replacesTitle: originalTitle
  │      - startTime, endTime, category, linkedGoalId
  └── (If rescheduled) Yields Rescheduled Occurrence:
         - id: `resched_${templateId}_${date}`
         - isRescheduled: true
         - startTime, endTime from rescheduledTo
```

---

## C. Data Model Changes

### 1. [`src/types/routine.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/types/routine.ts)

Extend `ActivityStatusSchema`:
```ts
export const ActivityStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'partial',
  'skipped',
  'postponed',
  'replaced',
  'rescheduled',
]);
```

Extend `OccurrenceOverrideSchema`:
```ts
export const ReplacementActivityDetailsSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  category: ActivityCategorySchema.default('other'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().default(0),
  reason: z.string().optional(),
  linkedGoalId: z.string().optional(),
  isTemporary: z.boolean().default(true),
  color: z.string().optional(),
});
export type ReplacementActivityDetails = z.infer<typeof ReplacementActivityDetailsSchema>;

export const RescheduleDetailsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type RescheduleDetails = z.infer<typeof RescheduleDetailsSchema>;

// Extend OccurrenceOverrideSchema with:
isReplaced: z.boolean().default(false),
replacementActivity: ReplacementActivityDetailsSchema.optional(),
originalActivitySnapshot: z.object({
  title: z.string(),
  category: ActivityCategorySchema,
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: z.number(),
  goalId: z.string().optional(),
}).optional(),
partialDurationMinutes: z.number().optional(),
rescheduledTo: RescheduleDetailsSchema.optional(),
```

Extend `ActivityOccurrence`:
```ts
export interface ActivityOccurrence {
  // Existing fields...
  isReplaced?: boolean;
  replacement?: ReplacementActivityDetails;
  replacementReason?: string;
  isReplacement?: boolean;
  replacesTemplateId?: string;
  replacesTitle?: string;
  isRescheduled?: boolean;
  rescheduledFrom?: {
    originalStartTime: string;
    originalEndTime: string;
  };
  linkedGoalId?: string;
}
```

### Backward Compatibility
All added fields are `.optional()` or have safe defaults (`default(false)`). Existing stored JSON in `localStorage` and Firestore documents deserialize without error.

---

## D. File-by-File Implementation Plan

| File or directory | Action | Purpose | Verification |
|---|---|---|---|
| [`src/types/routine.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/types/routine.ts) | Modify | Add `replaced` & `rescheduled` statuses, replacement schemas to `OccurrenceOverrideSchema`, and occurrence fields | `npm test` & typecheck |
| [`src/lib/occurrence-generator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/occurrence-generator.ts) | Modify | Synthesize original replaced block, replacement occurrence, and rescheduled occurrence | `src/lib/occurrence-generator.test.ts` |
| [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts) | Modify | Isolate goal completion sync: prevent replaced blocks from incrementing original goals; route replacement completions only to replacement's `linkedGoalId` | `src/lib/repositories/life-goals.test.ts` |
| [`src/lib/notifications/notification-manager.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/notifications/notification-manager.ts) | Modify | Skip notifications for `replaced` occurrences; schedule notifications for replacement occurrences | `src/lib/notifications/notification-manager.test.ts` |
| [`src/lib/analytics/analytics-calculator.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/analytics/analytics-calculator.ts) | Modify | Include `replaced` in status breakdown, ensure accurate actual minutes calculation | `src/lib/analytics/analytics-calculator.test.ts` |
| [`src/components/routine/replace-block-dialog.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/replace-block-dialog.tsx) | Create | Interactive replacement dialog with library selection, temporary activity creator, partial minutes, rescheduling, and conflict preview | Component unit test |
| [`src/components/routine/activity-timeline-item.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/activity-timeline-item.tsx) | Modify | Add "Replace block" action button (`ArrowLeftRight`), render visual badges for replaced and replacement occurrences | Timeline unit test |
| [`src/components/routine/current-activity-card.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/routine/current-activity-card.tsx) | Modify | Add "Replace" button in current card actions | Timeline unit test |
| [`src/app/page.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/page.tsx) | Modify | Wire `ReplaceBlockDialog` state, handle replacement confirmation, save override, log partial work, trigger notification reconciliation | Manual & E2E checks |
| [`src/lib/repositories/override-replacement.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/override-replacement.test.ts) | Create | Unit tests verifying end-to-end replacement generation, goal isolation, and partial progress | `vitest run` |

---

## E. Implementation Phases

### Phase 1: Core Models & Occurrence Generation
- **Objective**: Extend Zod schemas and update `generateDailyOccurrences` to support replacement and rescheduled occurrences.
- **Tasks**:
  1. Add `'replaced'` and `'rescheduled'` to `ActivityStatusSchema`.
  2. Add replacement fields to `OccurrenceOverrideSchema` and `ActivityOccurrence`.
  3. Update `generateDailyOccurrences` to emit original replaced block, replacement block, and optional rescheduled block.
- **Verification**: New unit tests in `src/lib/occurrence-generator.test.ts` passing.

### Phase 2: Life Goal Tracking & Isolation
- **Objective**: Ensure replaced activities never corrupt original Life Goal metrics.
- **Tasks**:
  1. Update `LifeGoalRepository.syncCompletedRoutineToLifeGoals` to check `occurrence.isReplacement`.
  2. If `occurrence.isReplacement` is true, sync only to `occurrence.linkedGoalId` (if provided).
  3. Ensure replaced blocks with status `'replaced'` are skipped from completion sync.
  4. Ensure partial progress recorded on the original activity is accurately credited.
- **Verification**: New unit tests in `src/lib/repositories/life-goals.test.ts` passing.

### Phase 3: Notifications & Analytics Reconciliation
- **Objective**: Keep notifications and analytics in sync with replaced schedules.
- **Tasks**:
  1. Update `NotificationManager.compute72HourSchedule` to skip notifications for occurrences with status `'replaced'`.
  2. Ensure replacement occurrences schedule notifications within the 72-hour window.
  3. Update `AnalyticsCalculator.computeSummary` to track `statusCounts.replaced` and compute accurate actual minutes.
- **Verification**: Unit tests in `notification-manager.test.ts` and `analytics-calculator.test.ts` passing.

### Phase 4: Replace Routine Block Modal Component
- **Objective**: Build the user-facing `ReplaceBlockDialog`.
- **Tasks**:
  1. Implement `ReplaceBlockDialog` in `src/components/routine/replace-block-dialog.tsx`:
     - Planned block summary (Title, Category, Time, Goal).
     - Activity selector: Library routine vs Temporary task.
     - Start/end time inputs with live duration and conflict detection preview.
     - Partial work input (minutes completed so far).
     - Action choice: Replace in-place vs Reschedule original to later time.
     - Reason field with fast preset chips.
     - Life Goal selector dropdown.
     - Recurrence scope selection (Today only vs future).
- **Verification**: Component rendering and interaction test passing.

### Phase 5: Timeline & Current Card Integration
- **Objective**: Integrate replacement action into Timeline and Current Activity Card.
- **Tasks**:
  1. Add `onOpenReplace` prop and `ArrowLeftRight` button to `ActivityTimelineItem`.
  2. Add `onOpenReplace` to `CurrentActivityCard`.
  3. Render distinct styling and badges:
     - Replaced block: Dimmed card with `Replaced (by X)` badge and strike-through/italic styling.
     - Replacement block: Card with `Replacement (for Y)` badge.
  4. Wire dialog into `src/app/page.tsx`.
- **Verification**: Run `npm test` and verify full app compilation.

---

## F. Testing Strategy

1. **Unit Tests**:
   - `src/lib/occurrence-generator.test.ts`: Test generating occurrences with standard overrides, replacement overrides, partial work, and rescheduled blocks.
   - `src/lib/repositories/override-replacement.test.ts`: Dedicated test suite testing replacement workflows end-to-end.
   - `src/lib/repositories/life-goals.test.ts`: Verify goal progress isolation.
   - `src/lib/notifications/notification-manager.test.ts`: Verify notifications cancelled for replaced blocks and scheduled for replacements.
   - `src/lib/analytics/analytics-calculator.test.ts`: Verify planned vs actual duration and `replaced` status count.
2. **Integration / UI Component Tests**:
   - `src/components/routine/today-timeline-mobile.test.tsx`: Test timeline interaction with replaced items.
3. **Regression Suite**:
   - Execute all existing 26 test files (218+ tests) to guarantee zero regressions.

---

## G. Migration and Deployment

- No database migration script required; Firestore documents are schema-less and backwards-compatible with optional fields.
- Local storage schema automatically parses existing overrides seamlessly.

---

## H. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| User accidentally replaces a block permanently | Default scope is strictly "This occurrence only" (`selectedDate`). Recurring changes require explicit multi-step selection. |
| Time slot overlap with fixed commitment | Real-time conflict preview inside `ReplaceBlockDialog` alerts the user before saving. |
| Goal progress double-counting | Comprehensive test suite checking both manual entries and automatic sync guarantees isolation. |

---

## I. Definition of Done Checklist

- [ ] `ActivityStatusSchema` extended with `'replaced'` and `'rescheduled'`.
- [ ] `OccurrenceOverrideSchema` extended with replacement and reschedule structures.
- [ ] `generateDailyOccurrences` generates original replaced block, replacement occurrence, and rescheduled occurrence.
- [ ] `ReplaceBlockDialog` component created and fully responsive.
- [ ] Timeline item and Current card display "Replace" action and proper badges.
- [ ] Goal completion sync verified to isolate original and replacement activities.
- [ ] Partial work duration on interrupted block recorded accurately.
- [ ] 72-hour notification schedule cancels replaced reminders and adds replacement reminders.
- [ ] Analytics calculator accounts for replaced statuses and accurate actual minutes.
- [ ] All existing and new unit tests pass with 100% success rate.
- [ ] Production build (`next build`) compiles without errors or warnings.

---

## J. Complexity Estimate

- **Complexity**: Medium
- **Primary Uncertainties**:
  - Fine-tuning the visual hierarchy on mobile screens so that replaced blocks remain legible without cluttering the timeline.
  - Ensuring seamless synchronization between `OccurrenceOverride` and `ActivityLog` when partial work is recorded simultaneously.
