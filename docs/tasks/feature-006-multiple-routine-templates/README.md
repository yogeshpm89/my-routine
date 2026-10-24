# Task Overview: Multiple Routine Templates and Day-Based Assignment

## A. Task Metadata

- **Task ID**: `feature-006-multiple-routine-templates`
- **Task Title**: Multiple Routine Templates and Day-Based Assignment
- **Task Type**: Feature
- **Source Request**: [GitHub Issue #6](https://github.com/yogeshpm89/my-routine/issues/6)
- **Date Prepared**: 2026-10-24
- **Current Workflow Stage**: Phase 6 — Stop and Request Approval
- **Approval Status**: AWAITING USER APPROVAL

---

## B. Problem Statement

The current application relies on a single pool of routine activity blocks (`RoutineTemplate[]`) filtered individually by recurrence frequency (`daily`, `weekdays`, `weekends`, `custom`). Real-world routines, however, are organized around distinct day contexts and lifestyles:

1. **Weekday Routine**: Work, deep focus, client meetings, school preparation, family time, and evening wind-down.
2. **Weekend Routine**: Relaxed mornings, Fullmoon Styles, cycling, personal learning, hobby projects, and leisure.
3. **Holiday Routine**: Flexible waking hours, no work commitments, travel, or family gatherings.
4. **Custom Routines**: Specific purpose schedules (fasting days, business trips, project crunch mode, exam weeks).

Users currently lack the ability to package a cohesive day schedule into a named template, preview it, import/export templates via JSON, or assign different templates to specific days of the week (e.g. Weekday Routine for Mon–Fri, Weekend Routine for Sat–Sun). Furthermore, switching a schedule for a single date without breaking recurring rules requires tedious manual cancellation of multiple individual occurrences.

---

## C. Current Behavior

1. **Flat Activity Blocks**: The application loads 21 baseline activity blocks (`template_wake_up`, `template_meditation`, `template_work_deep_1`, etc.) defined in `getInitialRoutineTemplates(userId)`.
2. **Single Schedule Pool**: `generateDailyOccurrences(templates, overrides, logs, targetDate)` receives all active blocks and filters them via `matchesRecurrence(template, targetDate)`.
3. **No Routine Grouping**: There is no parent entity representing a cohesive daily routine (e.g., "Weekday Routine" vs. "Weekend Routine").
4. **Static Days of Week**: Each block defines its own `recurrence.daysOfWeek`. Changing from a weekday schedule to a weekend schedule requires editing each block individually.
5. **No Date-Specific Template Switching**: To adopt a completely different schedule on a holiday or day off, users must manually cancel or modify individual occurrences rather than applying an alternative routine template for that date.
6. **No Routine Template Import/Export**: Users cannot share, upload, or download curated routine packages independently of full database backups.

---

## D. Expected Behavior

1. **Routine Templates Management**:
   - A dedicated **Routine Templates** section in navigation allows users to view, create, edit, duplicate, rename, preview, export, import, and delete day routine templates.
   - Each template has an ID, name, optional description, color theme, and a collection of configured routine blocks (reusing existing `RoutineTemplate` activity schemas).
2. **Weekly Routine Planner**:
   - Users can assign a routine template to each day of the week (Monday through Sunday).
   - Convenient shortcuts allow copying Monday's assignment across all weekdays (Mon–Fri) or Saturday's assignment to Sunday.
   - Fallback configuration clearly indicates which template is used if a day is unassigned.
3. **Occurrence Resolution & Deterministic Precedence**:
   - When viewing or generating schedule occurrences for a date, the system resolves the schedule using Asia/Kolkata timezone:
     1. Date-specific occurrence overrides and cancellations (`OccurrenceOverride`).
     2. Explicit date-specific template assignment (e.g., applying "Holiday Routine" to today or a date range).
     3. Weekday template assignment from the Weekly Planner.
     4. Default fallback template.
4. **Daily Schedule Integration**:
   - The daily schedule header displays the active template badge (e.g. `Weekday Routine` or `Weekend Routine`).
   - An inline quick-switch dropdown allows switching today's template on the fly without navigating away from the schedule.
   - Schedule conflicts/overlaps are immediately detected and flagged.
5. **JSON Template Import & Upload**:
   - Users can upload and import JSON routine template files with strict Zod validation, previewing blocks before confirming.
   - Detects name or ID collisions, offering choices to create a new copy or overwrite.
6. **Persistence & Offline Sync**:
   - Templates and weekly assignments are stored locally (`localStorage`) for offline guest mode and synced to Firestore under `/users/{userId}/` when connected.
   - Seamless migration for existing users: packages current 21 baseline blocks into "Default Weekday Routine" and seeds a "Weekend Routine" template without losing any historical logs, overrides, or goal progress.
7. **Notifications & Amazfit Integration**:
   - The 72-hour rolling notification window evaluates the resolved template for each date, cancelling obsolete alarms and scheduling new alarms while respecting quiet hours.

---

## E. Functional Requirements

- **FR-001 (Template Data Model)**: Define `DayRoutineTemplate` and `WeeklyPlannerAssignment` schemas supporting template ID, name, description, blocks, timestamps, and schema version.
- **FR-002 (Template CRUD)**: Provide ability to create, view, edit, duplicate, rename, and delete day routine templates.
- **FR-003 (Deletion Safeguards)**: Prevent accidental deletion of a template currently assigned in the Weekly Planner without explicit reassignment confirmation.
- **FR-004 (Template Preview)**: Provide a timeline/card preview of any routine template showing its scheduled blocks, categories, and total duration before applying or importing.
- **FR-005 (Weekly Planner UI)**: Create a Weekly Routine Planner view for assigning templates across Monday–Sunday with visual summary indicators.
- **FR-006 (Planner Shortcuts)**: Provide "Copy Monday to Weekdays" and "Copy Saturday to Sunday" actions in the Weekly Planner.
- **FR-007 (Precedence Engine)**: Integrate template resolution into `generateDailyOccurrences` with deterministic precedence: (1) occurrence overrides/cancellations, (2) date-specific template assignments, (3) weekday template assignments, (4) default template fallback.
- **FR-008 (Daily Schedule Header Integration)**: Display the resolved template name as an interactive pill badge on the Today view, allowing quick template switching for the selected date.
- **FR-009 (Scope Selection on Apply)**: When applying a template, provide scopes: "Today Only", "Date Range", "Selected Weekdays", and "Set as Weekly Default".
- **FR-010 (JSON Import/Export)**: Implement single-template JSON export and file upload import with Zod validation, error reporting, and collision resolution (create new vs replace).
- **FR-011 (Conflict Detection)**: Recalculate schedule conflicts and overlaps dynamically whenever the active template or date assignment changes.
- **FR-012 (Goal Integration)**: Maintain planned duration tracking and preserve accumulated goal minutes when switching templates.
- **FR-013 (72-Hour Notification Rescheduling)**: Recompute and reschedule local notifications and smartwatch mirroring using the resolved daily templates across the 72-hour window.
- **FR-014 (Offline & Cloud Sync)**: Persist templates and weekly assignments in offline cache (`localStorage`) and synchronize to Firestore `/users/{userId}/day_templates` and `/users/{userId}/weekly_planner`.
- **FR-015 (Full Backup Integration)**: Include saved templates and planner assignments in `BackupService.exportAllData` and restore them safely while maintaining backward compatibility with v1.0 backups.

---

## F. Non-Functional Requirements

- **NFR-001 (Timezone Integrity)**: Weekday resolution and schedule boundary calculations must strictly adhere to `Asia/Kolkata`.
- **NFR-002 (Data Preservation)**: Template switches must never delete, corrupt, or duplicate historical activity logs, past occurrence records, or Life Goals.
- **NFR-003 (Offline-First Operation)**: All template creation, editing, planner assignment, preview, and daily schedule generation must work 100% offline in guest mode without network dependencies.
- **NFR-004 (Performance)**: Resolving daily occurrences and detecting conflicts across a 7-day week view must complete in under 50ms.
- **NFR-005 (Security & User Isolation)**: All Firestore mutations must be isolated under `/users/{userId}/` using existing authenticated Firestore rules.
- **NFR-006 (Import Safety)**: File upload size must be restricted (< 1MB) and validated strictly against schema. Malformed or script-injected JSON must be rejected with actionable error messages.
- **NFR-007 (Battery & Notification Reliability)**: Notification rescheduling must deduplicate IDs and avoid thrashing OS notification alarms.

---

## G. Acceptance Criteria

- [x] **AC-001**: A user can view a list of all saved routine templates and create a new custom template with user-defined blocks.
- [x] **AC-002**: A user can duplicate an existing template, modify its title/blocks, and save it under a new name.
- [x] **AC-003**: A user can open the Weekly Routine Planner, assign "Weekday Routine" to Monday–Friday and "Weekend Routine" to Saturday–Sunday, and save the assignments.
- [x] **AC-004**: The daily schedule on Monday displays the "Weekday Routine" blocks; the daily schedule on Saturday displays the "Weekend Routine" blocks.
- [x] **AC-005**: A user can click the template badge on the daily schedule and switch today's template to "Holiday Routine" without affecting recurring weekly planner assignments for future weeks.
- [x] **AC-006**: Existing completed activity logs from prior days remain intact and visible in history, calendars, and analytics after switching or editing templates.
- [x] **AC-007**: A user can export a routine template as a `.json` file and import it back into the application; invalid JSON files display descriptive validation errors without crashing.
- [x] **AC-008**: When a template change introduces overlapping blocks, visual conflict warnings appear immediately on the daily timeline.
- [x] **AC-009**: Notification schedules for the rolling 72-hour window automatically update to reflect the newly resolved templates for today, tomorrow, and the day after.
- [x] **AC-010**: All template management, assignment, and switching features work seamlessly in offline guest mode.
- [x] **AC-011**: Full database JSON backup (`BackupService`) exports and imports day templates and weekly planner configuration with backward compatibility for legacy backups.
- [x] **AC-012**: TypeScript check (`npx tsc --noEmit`), Vitest suite (`npm run test`), and web production build (`npm run build:web`) pass with zero errors.

---

## H. Scope

### In Scope
- Day Routine Template data model, repository, and local persistence.
- Weekly Routine Planner UI and weekday assignment engine.
- Integration with `generateDailyOccurrences` using deterministic precedence.
- Quick template-switch popover/dialog on the daily schedule timeline.
- Template-level JSON export and import with file upload and Zod schema validation.
- Integration with `BackupService` for full system backups.
- Notification schedule reconciliation for the 72-hour rolling window.
- Seed data migration: auto-migrating existing baseline blocks into "Weekday Routine" and adding a pre-configured "Weekend Routine".
- Navigation integration in top desktop header and mobile drawer.
- Unit and integration tests for template management, weekly planner, precedence, import/export, and schedule generation.

### Out of Scope
- Automatic AI generation of routine templates based on calendar meetings (covered by separate AI actions hub).
- Multi-user template sharing or public template marketplace.
- CalDAV / Google Calendar two-way synchronization.

---

## I. Dependencies and Open Questions

### Verified Dependencies
- `src/types/routine.ts`: Base types (`RoutineTemplate`, `OccurrenceOverride`, `ActivityLog`).
- `src/lib/occurrence-generator.ts`: Schedule generation logic.
- `src/lib/repositories/routine-repository.ts`: Existing block repository.
- `src/lib/notifications/notification-manager.ts`: 72-hour rolling notification engine.
- `src/lib/sync/backup-service.ts`: System backup and restore engine.

### Open Design Questions for User Consideration
1. **Pre-seeded Templates**: Should the system automatically seed two default templates for all users upon first launch:
   - *"Weekday Routine"* (containing the 21 baseline productivity/work habit blocks)?
   - *"Weekend Routine"* (containing Fullmoon Styles, cycling, personal learning, family time)?
   *(Recommended: Yes, gives immediate utility out of the box).*
2. **Unassigned Day Fallback**: If a day has no assignment in the Weekly Planner, should it fall back to "Weekday Routine" or show a blank day with a prompt to select a template?
   *(Recommended: Fall back to default template with a clear indicator tag).*

---

## J. Requirement Traceability Matrix

| Requirement | Acceptance Criteria | Implementation Component | Test Suite |
|---|---|---|---|
| FR-001, FR-002 | AC-001, AC-002 | `src/types/routine-templates.ts`, `day-template-repository.ts` | `day-template.test.ts` |
| FR-003, FR-004 | AC-001, AC-002 | `src/components/templates/template-management-view.tsx` | `template-management.test.tsx` |
| FR-005, FR-006 | AC-003 | `src/components/templates/weekly-planner-view.tsx` | `weekly-planner.test.tsx` |
| FR-007, FR-008 | AC-004, AC-005 | `src/lib/occurrence-generator.ts`, `src/app/page.tsx` | `occurrence-generator.test.ts` |
| FR-009, FR-011 | AC-005, AC-008 | `src/components/templates/apply-template-dialog.tsx`, `conflict-detector.ts` | `conflict-detector.test.ts` |
| FR-010 | AC-007 | `src/lib/templates/template-io.ts`, `template-import-dialog.tsx` | `template-io.test.ts` |
| FR-012, FR-013 | AC-009 | `src/lib/notifications/notification-manager.ts` | `notification-manager.test.ts` |
| FR-014, FR-015 | AC-010, AC-011 | `src/lib/sync/backup-service.ts`, `mutation-queue.ts` | `sync-engine.test.ts` |
