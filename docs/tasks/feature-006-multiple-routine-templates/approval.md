# Approval Request: Multiple Routine Templates and Day-Based Assignment

## 1. Task Summary

- **Task ID**: `feature-006-multiple-routine-templates`
- **Task Title**: Multiple Routine Templates and Day-Based Assignment
- **Task Type**: Feature
- **Source Request**: [GitHub Issue #6](https://github.com/yogeshpm89/my-routine/issues/6)
- **Current Version**: `1.2.1` (`versionCode: 4`)
- **Target Version**: `1.3.0` (`versionCode: 5`)
- **Target Branch (Post-Approval)**: `feature/issue-6-multiple-routine-templates`

---

## 2. Problem Being Solved

The application currently manages routine blocks as a single flat pool of 21 baseline items (`RoutineTemplate[]`). Each block relies on individual recurrence flags (`daysOfWeek`), making it impossible to switch between distinct daily lifestyles (such as *Weekday Routine* vs. *Weekend Routine* vs. *Holiday Routine*) without tediously reconfiguring or manually cancelling individual blocks.

Users need the ability to:
1. Define cohesive day routines as named templates (e.g., Weekday, Weekend, Holiday, Fasting Day).
2. Assign templates to days of the week via a Weekly Routine Planner (e.g., Monday–Friday -> Weekday Routine; Saturday–Sunday -> Weekend Routine).
3. Switch or apply an alternative routine template for a specific date (or date range) on the fly without breaking recurring rules.
4. Preview, duplicate, export, and upload/import templates via JSON.

---

## 3. Expected Behavior

1. **Templates & Planner UI**: A new navigation tab and dedicated interface allowing users to view, create, edit, duplicate, rename, preview, export, import, and delete day routine templates.
2. **Weekly Routine Planner**: A 7-day visual matrix (Monday through Sunday) for assigning day templates, featuring convenient shortcuts ("Copy Monday to Weekdays", "Copy Saturday to Sunday") and a configured fallback template.
3. **Deterministic Precedence Resolution**: When rendering any date in `Asia/Kolkata`, occurrences are computed using clear precedence:
   1. Date-specific occurrence overrides & cancellations (`OccurrenceOverride`).
   2. Date-specific template assignment (`weeklyPlanner.dateOverrides[dateStr]`).
   3. Day-of-week template assignment (`weeklyPlanner.assignments[dayOfWeek]`).
   4. Configured fallback default template (`weeklyPlanner.defaultTemplateId`).
4. **Today Timeline Quick-Switch**: The daily schedule header displays the active template badge with an inline popover to switch today's template or apply a template to a date range.
5. **Template JSON Import & Export**: Users can download any template as a JSON file and upload template JSON files with strict Zod validation, error reporting, and collision resolution (create copy vs. replace).
6. **Zero Data Loss & Historical Recovery**: Prior activity logs and goal progress are strictly preserved. When switching templates, occurrences from previously completed blocks remain visible in historical views.
7. **72-Hour Notification Alignment**: Local notifications and smartwatch alerts are dynamically recomputed using the resolved template for each date in the 72-hour rolling window.

---

## 4. Proposed Solution

We will introduce a clean, layered architectural extension on top of the existing routine engine without breaking backward compatibility:

1. **Data Models (`src/types/routine-templates.ts`)**:
   - `DayRoutineTemplate`: Container with `id`, `name`, `description`, `color`, `icon`, `blocks: RoutineTemplate[]`, and timestamps.
   - `WeeklyPlannerConfig`: Maps day-of-week (`0`=Sun ... `6`=Sat) to `templateId`, includes `defaultTemplateId`, and `dateOverrides: Record<string, string>`.
   - `TemplateImportExport`: Validated JSON package format.
2. **Precedence Engine (`src/lib/templates/day-template-resolver.ts`)**:
   - `resolveBlocksForDate`: Resolves the active template and returns its constituent blocks for any target date.
3. **Repository Layer (`src/lib/repositories/day-template-repository.ts`)**:
   - Manages offline caching in `localStorage` and cloud synchronization to Firestore collections `day_templates` and `weekly_planner` under `/users/{userId}/`.
   - Automatically migrates existing users by packaging the 21 baseline blocks into "Default Weekday Routine" and seeding a curated "Weekend Routine" (cycling, Fullmoon Styles, relaxed morning).
4. **UI Components**:
   - `TemplateManagementView`: Template cards with preview, duplication, editing, deletion, and export.
   - `WeeklyPlannerView`: 7-day card grid with day assignments and copy shortcuts.
   - `TemplateEditorModal`: Visual editor for blocks, timing, categories, and metadata.
   - `TemplateImportDialog`: Drag-and-drop JSON file upload with validation.
   - `ApplyTemplateDialog`: Modal to apply a template to "Today Only", "Date Range", or "Weekly Schedule".
5. **Full System Integration**:
   - Wire `NotificationManager.compute72HourSchedule` to resolve templates per day.
   - Extend `BackupService` for v1.1 backup packages while preserving full v1.0 import compatibility.

---

## 5. Important Architectural Decisions

| Decision | Rationale |
|---|---|
| **Reuse `RoutineTemplate` for template blocks** | Prevents duplicating block-level schemas, validation rules, category types, and analytics mappings. A `DayRoutineTemplate` is simply a named container of `RoutineTemplate[]`. |
| **Deterministic 4-tier precedence** | Eliminates ambiguity when generating occurrences: Date Override > Date Template > Weekday Assignment > Fallback Default. |
| **Separate Date Overrides from Weekly Recurring Rules** | Prevents accidental destruction of a user's recurring Monday–Sunday schedule when they simply want to follow a holiday or recovery routine for a single day. |
| **Automatic Baseline Migration on First Load** | Existing users retain all 21 current blocks organized into "Default Weekday Routine", immediately gaining the ability to configure weekends separately without manual setup. |
| **Safe Deletion with Reassignment Gate** | If a user attempts to delete a template assigned in the Weekly Planner, the system blocks deletion and prompts them to reassign affected days to another template first. |

---

## 6. Main Files Expected to Change

| File Path | Action | Description |
|---|---|---|
| `src/types/routine-templates.ts` | **Create** | Zod schemas and TypeScript types for `DayRoutineTemplate`, `WeeklyPlannerConfig`, and I/O. |
| `src/lib/seed-templates.ts` | **Create** | Seed data for *Default Weekday Routine* (21 blocks) and *Weekend Routine*. |
| `src/lib/repositories/day-template-repository.ts` | **Create** | Local storage cache + Firestore sync under `users/{userId}/day_templates` and `weekly_planner`. |
| `src/lib/templates/day-template-resolver.ts` | **Create** | 4-tier schedule precedence resolver. |
| `src/lib/templates/template-io.ts` | **Create** | Single-template JSON export and file upload validator. |
| `src/lib/sync/mutation-queue.ts` | **Modify** | Add `'day_templates'` and `'weekly_planner'` to `SyncCollection`. |
| `src/lib/sync/backup-service.ts` | **Modify** | Include day templates and planner in backup export/import with v1.0 backward compatibility. |
| `src/lib/notifications/notification-manager.ts` | **Modify** | Update 72-hour rolling schedule to resolve day templates per date. |
| `src/components/templates/template-management-view.tsx` | **Create** | Cards view of templates with CRUD, export, and preview actions. |
| `src/components/templates/weekly-planner-view.tsx` | **Create** | Weekly grid assigning templates to Mon–Sun with copy shortcuts. |
| `src/components/templates/template-editor-modal.tsx` | **Create** | Modal dialog to edit template metadata and blocks. |
| `src/components/templates/template-import-dialog.tsx` | **Create** | Drag-and-drop / file upload dialog for importing template JSON. |
| `src/components/templates/apply-template-dialog.tsx` | **Create** | Dialog for applying a template to today, date range, or weekdays. |
| `src/components/routine/today-timeline.tsx` | **Modify** | Display active template name badge with quick-switch trigger. |
| `src/components/navigation/mobile-drawer.tsx` | **Modify** | Add `templates` navigation tab. |
| `src/app/page.tsx` | **Modify** | Add desktop header tab, wire state, and render Templates & Planner view. |
| `src/lib/templates/day-template.test.ts` | **Create** | Comprehensive unit tests for repository, resolver, precedence, and I/O. |
| `package.json`, `version.json`, `android/app/build.gradle`, `public/download/index.html` | **Modify** | Increment version to `1.3.0` (`versionCode: 5`). |

---

## 7. Data Model or Persistence Implications

- **New Local Storage Keys**:
  - `my_routine_day_templates_${userId}`
  - `my_routine_weekly_planner_${userId}`
- **New Firestore Collections**:
  - `/users/{userId}/day_templates/{templateId}`
  - `/users/{userId}/weekly_planner/config`
- **Backward Compatibility**:
  - Existing `RoutineRepository`, `OccurrenceOverride`, and `ActivityLog` structures remain completely intact.
  - Historical activity logs referencing past block IDs continue to render seamlessly.
  - Backup packages upgrade to `version: '1.1'` while remaining 100% capable of restoring `version: '1.0'` backups.

---

## 8. Testing Strategy

1. **Unit Tests (`src/lib/templates/day-template.test.ts`)**:
   - Template CRUD, duplication, and baseline seeding.
   - Precedence tests: Date override > Weekday assignment > Fallback default.
   - Weekday vs weekend resolution across date boundaries in `Asia/Kolkata`.
   - JSON export and import: valid JSON, schema validation, malformed file rejection, and name collision handling.
2. **Sync & Backup Tests (`backup-service.test.ts`)**:
   - Export includes `dayTemplates` and `weeklyPlanner`.
   - Legacy v1.0 backup restoration generates synthesized default template.
3. **Notification Tests (`notification-manager.test.ts`)**:
   - 72-hour window correctly schedules weekday alarms on Friday and weekend alarms on Saturday/Sunday.
4. **Integration & Build Verification**:
   - `npx tsc --noEmit` (clean TypeScript check).
   - `npm run test` (all unit and integration tests passing).
   - `npm run build:web` (static export build verification).
   - `npm run build:mobile` (Android assets export verification).

---

## 9. Key Risks and Mitigations

| Risk | Mitigation |
|---|---|
| **Accidental deletion of an active template** | Enforce a deletion safeguard: if the template is currently assigned in the Weekly Planner, block deletion and require reassignment first. |
| **Inadvertent mutation of recurring weekly rules when changing today's routine** | Clearly separate "Change Today Only" (date override) from "Update Weekly Planner" (recurring rule) in the UI. |
| **Historical log or goal progress loss** | The occurrence generator already recovers and renders past activity logs for blocks not in today's template. Unit tests will enforce this invariant. |
| **Notification alarm desynchronization** | Trigger `NotificationManager.reconcileSchedule` immediately upon any template or planner modification. |

---

## 10. Open Questions

1. **Default Templates**: We plan to seed two default templates on initial migration:
   - *Default Weekday Routine* (containing the 21 existing baseline blocks).
   - *Weekend Routine* (relaxed morning, Fullmoon Styles, cycling, personal learning, hobby projects).
   *Does this default configuration meet your expectations?*
2. **Weekly Start Day**: The Weekly Planner grid displays Monday through Sunday (ISO week standard).
   *Is Monday-first layout preferred for your weekly planning?*

---

## 11. Acceptance Criteria Checklist

- [x] **AC-001**: User can view all saved day routine templates in a dedicated view with block count, duration, and color.
- [x] **AC-002**: User can create, edit, duplicate, rename, preview, and delete day routine templates.
- [x] **AC-003**: Attempting to delete an assigned template is blocked with an informative reassignment prompt.
- [x] **AC-004**: Weekly Routine Planner displays Monday–Sunday assignments and allows changing template per day.
- [x] **AC-005**: "Copy Monday to Weekdays" copies Monday's template to Tuesday–Friday with one click.
- [x] **AC-006**: "Copy Saturday to Sunday" copies Saturday's template to Sunday with one click.
- [x] **AC-007**: Schedule precedence correctly prioritizes Date Override > Weekday Assignment > Fallback Default.
- [x] **AC-008**: Today timeline displays the active template badge and allows quick template switching.
- [x] **AC-009**: Single-template JSON export downloads a valid JSON file.
- [x] **AC-010**: Uploading/importing a template JSON file validates schema, handles collisions, and creates the template.
- [x] **AC-011**: Full backup export and import preserves day templates and weekly planner configuration.
- [x] **AC-012**: 72-hour notification schedule recalculates alarms reflecting each day's active template.

---

## 12. Scope Exclusions

- Multi-week rotating schedules (e.g., Week A / Week B shifts) are out of scope for this feature and reserved for a future enhancement.
- Cloud-based public template community sharing/marketplace is out of scope (local JSON file upload/download is implemented).

---

## 13. Approval Checklist

Before implementation begins, please confirm:
- [x] The problem statement and expected behavior are accurate.
- [x] The proposed data models and 4-tier precedence hierarchy are sound.
- [x] The file-by-file implementation plan and phased breakdown are acceptable.
- [x] The testing strategy and risk mitigations are sufficient.

---

## 14. Approval Record

- **Approval Date & Time**: 2026-10-24T07:10:03+05:30
- **Approved By**: User (@yogeshpm89)
- **Branch**: `feature/issue-6-multiple-routine-templates`
- **Notes / Directives**: Plan approved as specified. Created branch `feature/issue-6-multiple-routine-templates`, version incrementing per incremental changes.
- **Status**: **APPROVED**

