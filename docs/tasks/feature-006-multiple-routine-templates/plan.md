# Implementation Plan: Multiple Routine Templates and Day-Based Assignment

## A. Proposed Solution

The goal of this task is to enable users to define, customize, and manage multiple named daily routine templates (such as *Weekday Routine*, *Weekend Routine*, *Holiday Routine*, and *Custom Routines*) and assign them to specific days of the week through an intuitive **Weekly Routine Planner**, while allowing quick, date-specific overrides on the fly.

This will be implemented as a clean architectural layer on top of the existing routine block and occurrence engine:
1. **Model Layer**: Introduce `DayRoutineTemplate` (a named collection of `RoutineTemplate` activity blocks) and `WeeklyPlannerConfig` (weekday assignments `0–6`, default fallback, and date-specific template overrides).
2. **Resolver Layer**: Introduce `DayTemplateResolver` to determine which template and blocks apply to any given date using a deterministic precedence hierarchy.
3. **Repository Layer**: Introduce `DayTemplateRepository` supporting offline `localStorage` caching and Firestore synchronization under `/users/{userId}/day_templates` and `/users/{userId}/weekly_planner`.
4. **UI Layer**:
   - Add a unified **Templates & Planner** tab in desktop header and mobile drawer.
   - Dedicated **Routine Templates View**: Create, edit, duplicate, rename, preview, export, import, and delete templates.
   - Dedicated **Weekly Planner View**: 7-day card matrix with quick-copy actions ("Copy Mon to Weekdays", "Copy Sat to Sun").
   - **Daily Schedule Integration**: Displays active template name on the Today timeline with a quick-switch action.
5. **Notification & Backup Integration**:
   - Update 72-hour rolling notification window to resolve day templates per date.
   - Extend `BackupService` with backward-compatible export/import.
   - Seed baseline templates (*Weekday Routine* and *Weekend Routine*) seamlessly for new and existing users.

---

## B. Architecture and Data Flow

### Precedence Hierarchy
When generating the schedule for any date (`targetDate: YYYY-MM-DD` in `Asia/Kolkata`):
1. **Tier 1 (Date-Specific Occurrence Overrides)**: Any explicit changes/cancellations to individual blocks (`OccurrenceOverride`) take highest priority.
2. **Tier 2 (Date-Specific Template Overrides)**: If user explicitly applied a template to `targetDate` (recorded in `weeklyPlanner.dateOverrides[targetDate]`), use that template's blocks.
3. **Tier 3 (Weekly Day Assignment)**: Look up `weeklyPlanner.assignments[dayOfWeek]` (where `0` = Sunday, `1` = Monday ... `6` = Saturday).
4. **Tier 4 (Configured Fallback)**: If day is unassigned, use `weeklyPlanner.defaultTemplateId`.

### Data Flow Diagram
```
User Selection / Calendar Navigation
              │
              ▼
    DayTemplateResolver.resolveBlocksForDate(dateStr, planner, templates)
              │
              ├─► Looks up dateOverrides[dateStr]
              ├─► Looks up assignments[dayOfWeek]
              └─► Falls back to defaultTemplateId
              │
              ▼
   Resolved RoutineTemplate[] Blocks
              │
              ▼
   generateDailyOccurrences(blocks, overrides, logs, dateStr)
              │
              ├─► Filters by active recurrence / exceptions
              ├─► Applies OccurrenceOverride modifications/cancellations
              ├─► Preserves historical ActivityLogs from unselected templates
              └─► Sorts chronologically & detects overlaps (detectScheduleConflicts)
              │
              ▼
   Rendered on TodayTimeline / WeekView / MonthView & Synced to Notifications
```

---

## C. Data Model Changes

### 1. New Types (`src/types/routine-templates.ts`)
```ts
import { z } from 'zod';
import { RoutineTemplateSchema, RoutineTemplate } from './routine';

export const DayRoutineTemplateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional().default(''),
  color: z.string().default('#3b82f6'),
  icon: z.string().optional(),
  blocks: z.array(RoutineTemplateSchema).default([]),
  isDefault: z.boolean().default(false),
  schemaVersion: z.number().default(1),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type DayRoutineTemplate = z.infer<typeof DayRoutineTemplateSchema>;

export const DayOfWeekSchema = z.number().min(0).max(6); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

export const WeeklyPlannerConfigSchema = z.object({
  userId: z.string(),
  // Mapping day of week 0..6 to DayRoutineTemplate.id
  assignments: z.record(z.string(), z.string()).default({}),
  defaultTemplateId: z.string(),
  // Date-specific template assignments: YYYY-MM-DD -> templateId
  dateOverrides: z.record(z.string(), z.string()).default({}),
  updatedAt: z.number(),
});
export type WeeklyPlannerConfig = z.infer<typeof WeeklyPlannerConfigSchema>;

export const TemplateImportExportSchema = z.object({
  schemaVersion: z.literal(1),
  type: z.literal('my_routine_template'),
  exportedAt: z.string(),
  template: DayRoutineTemplateSchema.omit({ userId: true }),
});
export type TemplateImportExport = z.infer<typeof TemplateImportExportSchema>;
```

### 2. Full Backup Extension (`src/lib/sync/backup-service.ts`)
```ts
export interface RoutineBackupPackage {
  version: '1.0' | '1.1';
  exportedAt: string;
  userId: string;
  templates: RoutineTemplate[];
  overrides: OccurrenceOverride[];
  logs: ActivityLog[];
  goals: GoalTarget[];
  lifeGoals?: LifeGoal[];
  dayTemplates?: DayRoutineTemplate[];
  weeklyPlanner?: WeeklyPlannerConfig;
}
```

---

## D. File-by-File Implementation Plan

| File / Path | Action | Purpose | Verification |
|---|---|---|---|
| `src/types/routine-templates.ts` | **Create** | Zod schemas and TypeScript types for `DayRoutineTemplate`, `WeeklyPlannerConfig`, and import/export schemas. | TypeScript check (`tsc`) & unit test |
| `src/lib/seed-templates.ts` | **Create** | Default seed templates (*Default Weekday Routine* with 21 blocks, *Weekend Routine* with Fullmoon Styles & cycling). | Unit test |
| `src/lib/repositories/day-template-repository.ts` | **Create** | Local storage cache + Firestore sync under `users/{userId}/day_templates` and `weekly_planner`. | Repository unit tests |
| `src/lib/templates/day-template-resolver.ts` | **Create** | Deterministic 4-tier schedule precedence resolver. | Resolver unit tests |
| `src/lib/templates/template-io.ts` | **Create** | Template-level JSON export and file upload validator with error reporting. | IO unit tests |
| `src/lib/sync/mutation-queue.ts` | **Modify** | Add `'day_templates'` and `'weekly_planner'` to `SyncCollection`. | Existing sync tests |
| `src/lib/sync/backup-service.ts` | **Modify** | Include `dayTemplates` and `weeklyPlanner` in backup export/import with backward compatibility. | Backup unit tests |
| `src/lib/notifications/notification-manager.ts` | **Modify** | Recompute 72-hour rolling schedule by resolving templates per day. | Notification unit tests |
| `src/components/templates/template-management-view.tsx` | **Create** | Cards view of all saved templates with create, edit, duplicate, export, preview, and delete actions. | Component test |
| `src/components/templates/weekly-planner-view.tsx` | **Create** | Weekly grid assigning templates to Mon–Sun with copy shortcuts. | Component test |
| `src/components/templates/template-editor-modal.tsx` | **Create** | Modal dialog to edit template metadata and manage routine blocks. | Component test |
| `src/components/templates/template-import-dialog.tsx` | **Create** | Drag-and-drop / file upload dialog for importing template JSON files. | Component test |
| `src/components/templates/apply-template-dialog.tsx` | **Create** | Dialog for applying a template to today, date range, or weekdays. | Component test |
| `src/components/routine/today-timeline.tsx` | **Modify** | Display active template name badge with quick-switch trigger. | Component test |
| `src/components/navigation/mobile-drawer.tsx` | **Modify** | Add `templates` navigation tab. | Visual & navigation test |
| `src/app/page.tsx` | **Modify** | Add desktop header tab, wire state, and render Templates & Planner view. | Integration test |
| `src/lib/templates/day-template.test.ts` | **Create** | Comprehensive unit tests for repository, resolver, precedence, and I/O. | `npm run test` |
| `package.json`, `version.json`, `build.gradle` | **Modify** | Increment version to `1.3.0` (`versionCode: 5`). | Build verification |

---

## E. Implementation Phases

### Phase 1: Models, Seed Data, and DayTemplateRepository
- **Objective**: Establish types, default weekday/weekend seed templates, and offline/online repository.
- **Tasks**:
  1. Create `src/types/routine-templates.ts`.
  2. Create `src/lib/seed-templates.ts` with "Weekday Routine" and "Weekend Routine".
  3. Create `src/lib/repositories/day-template-repository.ts`.
  4. Update `MutationQueue` to support `'day_templates'` and `'weekly_planner'`.
- **Validation**: Write and run unit tests for template creation, retrieval, seeding, and offline storage.

### Phase 2: Schedule Precedence Resolver & Occurrence Generation Integration
- **Objective**: Implement deterministic schedule resolution for any date in `Asia/Kolkata`.
- **Tasks**:
  1. Create `src/lib/templates/day-template-resolver.ts`.
  2. Implement `resolveBlocksForDate(dateStr, planner, templates, fallback)`.
  3. Verify historical log preservation and override compatibility.
- **Validation**: Unit tests verifying weekday vs weekend resolution, date-specific overrides, and unassigned fallbacks.

### Phase 3: Template Import / Export & BackupService Integration
- **Objective**: Support single-template JSON file upload/download and full system backup/restore.
- **Tasks**:
  1. Create `src/lib/templates/template-io.ts` with Zod validation.
  2. Extend `BackupService.exportAllData` and `importBackupData` to include `dayTemplates` and `weeklyPlanner`.
  3. Support legacy v1.0 backup upgrades.
- **Validation**: Test export, import, corrupted JSON handling, schema mismatch rejection, and legacy backup restore.

### Phase 4: UI Suite — Template Management & Weekly Planner
- **Objective**: Build intuitive, responsive desktop and mobile UI for managing templates and weekly schedules.
- **Tasks**:
  1. Build `template-management-view.tsx` (cards, badges, block count, actions).
  2. Build `weekly-planner-view.tsx` (7-day grid, dropdowns, "Copy Mon to Weekdays", "Copy Sat to Sun").
  3. Build `template-editor-modal.tsx` and `template-import-dialog.tsx`.
  4. Build `apply-template-dialog.tsx`.
- **Validation**: Component render tests and interaction tests.

### Phase 5: Daily Schedule Integration & 72-Hour Notifications
- **Objective**: Connect active template to the Today timeline and keep smartwatch/device alarms synchronized.
- **Tasks**:
  1. Update `TodayTimeline` to display active template name badge with quick-switch popover.
  2. Update `page.tsx` state and tab routing.
  3. Update `compute72HourSchedule` in `NotificationManager` to resolve templates dynamically per day.
- **Validation**: Verify switching today's template recalculates timeline occurrences and notification schedule.

### Phase 6: Automated Tests, Version Increment, & Build Verification
- **Objective**: Full automated test verification, documentation finalization, and build validation.
- **Tasks**:
  1. Run full test suite (`npm run test`).
  2. Increment project version to `1.3.0` (`versionCode: 5`).
  3. Run `npm run build:web` and `npm run build:mobile`.
  4. Document completion in `implementation-report.md`.
- **Validation**: All tests pass, static export succeeds with zero errors.

---

## F. Testing Strategy

1. **Unit Tests (`src/lib/templates/day-template.test.ts`)**:
   - Creating, editing, duplicating, and deleting day templates.
   - Weekday vs weekend resolution across date boundaries in `Asia/Kolkata`.
   - Precedence: Date template override > Weekly planner assignment > Default fallback.
   - Unassigned day fallback resolution.
   - JSON export and import: valid template, schema version check, malformed JSON, and name collision handling.
2. **Integration Tests (`src/lib/sync/sync-engine.test.ts` & `backup-service.test.ts`)**:
   - Backup export includes `dayTemplates` and `weeklyPlanner`.
   - Restoring a legacy v1.0 backup safely synthesizes a default template.
   - Offline mutation queue enqueueing and replaying.
3. **Notification Tests (`src/lib/notifications/notification-manager.test.ts`)**:
   - 72-hour window schedules weekday activities for Friday and weekend activities for Saturday/Sunday.
4. **UI Tests (`src/components/templates/templates.test.tsx`)**:
   - Template management view renders all cards and triggers editor.
   - Weekly planner renders Monday–Sunday and triggers quick-copy actions.
   - Quick template switch updates daily occurrences.

---

## G. Migration and Deployment

1. **Automatic Baseline Migration**:
   On first load of the updated app, `DayTemplateRepository.initializeTemplates(userId)` checks if any `DayRoutineTemplate` exists:
   - If empty, it packages the existing 21 baseline routine blocks into `"Weekday Routine"` (assigned Mon–Fri) and creates a pre-configured `"Weekend Routine"` (assigned Sat–Sun).
   - This ensures existing users experience zero disruption and immediately gain weekend/weekday separation.
2. **Backward Compatibility**:
   Existing `RoutineRepository`, `OccurrenceOverride`, and `ActivityLog` structures remain untouched. Existing calendar views continue functioning seamlessly.

---

## H. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Accidental deletion of an active template | High | Require confirmation and check if template is actively assigned in `weeklyPlanner`; if assigned, prompt user to select a replacement before deletion. |
| Inadvertent mutation of recurring weekly rules when changing today's routine | Medium | Clearly separate "Change Today Only" (date override) from "Update Weekly Planner" (recurring rule) in the UI. |
| Historical log or goal progress loss | High | `generateDailyOccurrences` already recovers and renders historical logs for any unselected/archived template; tests will enforce this invariant. |
| Notification alarm desynchronization | Medium | Trigger `NotificationManager.reconcileSchedule` immediately upon any template or planner change. |

---

## I. Definition of Done Checklist

- [ ] `DayRoutineTemplate` and `WeeklyPlannerConfig` models defined with Zod schemas.
- [ ] Default *Weekday Routine* and *Weekend Routine* seeded.
- [ ] Day routine templates can be created, edited, duplicated, renamed, previewed, and deleted.
- [ ] Weekly Routine Planner assigns templates across Monday–Sunday with copy shortcuts.
- [ ] Precedence engine resolves schedule with date overrides > weekday assignments > default fallback.
- [ ] Daily schedule timeline displays active template badge with inline quick-switch.
- [ ] Single-template JSON export and file upload import with validation.
- [ ] BackupService exports and imports templates with legacy backup compatibility.
- [ ] 72-hour notifications recompute per-day template occurrences.
- [ ] Full automated test suite passes (`npm run test`).
- [ ] TypeScript check (`npx tsc --noEmit`) and web production build (`npm run build:web`) pass.
- [ ] Version incremented to `1.3.0` (`versionCode: 5`).

---

## J. Complexity Estimation

- **Estimated Complexity**: **Medium-Large**
- **Primary Factors**: Multi-component integration spanning data models, occurrence generation, UI planner suite, JSON import/export, notifications, and offline persistence.
