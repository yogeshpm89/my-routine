# Technical Investigation: Multiple Routine Templates and Day-Based Assignment

## 1. Executive Summary

This investigation analyzes the architecture, data models, persistence pipelines, occurrence generation, and UI components of **My Routine** to design an extension supporting multiple user-defined routine templates and weekly day-based assignment.

The existing application is structured around individual activity blocks (`RoutineTemplate`) evaluated by an occurrence engine (`generateDailyOccurrences`). To satisfy [GitHub Issue #6](https://github.com/yogeshpm89/my-routine/issues/6), the system should introduce a higher-level composite entity, **`DayRoutineTemplate`**, which bundles a cohesive schedule of activity blocks (e.g. Weekday Routine vs Weekend Routine vs Holiday Routine), paired with a **`WeeklyPlannerAssignment`** mapping days of the week (`0` = Sun to `6` = Sat) to designated templates, and an explicit date override dictionary.

---

## 2. Relevant Repository Structure

```
my-routine/
├── src/
│   ├── types/
│   │   ├── routine.ts                 <-- Core RoutineTemplate, OccurrenceOverride, ActivityLog
│   │   ├── goals.ts                   <-- LifeGoal, GoalTrackedItem
│   │   └── notifications.ts           <-- Notification preferences and rules
│   ├── lib/
│   │   ├── occurrence-generator.ts     <-- Generates daily occurrences from blocks + overrides + logs
│   │   ├── conflict-detector.ts       <-- Detects overlaps and schedule conflicts
│   │   ├── time-utils.ts              <-- Asia/Kolkata date resolution, getDayOfWeek, timeToMinutes
│   │   ├── seed-data.ts               <-- 21 baseline routine blocks (getInitialRoutineTemplates)
│   │   ├── repositories/
│   │   │   ├── routine-repository.ts   <-- LocalStorage + Firestore for activity blocks
│   │   │   ├── override-repository.ts  <-- Date-specific activity modifications
│   │   │   ├── log-repository.ts       <-- Completed/skipped execution logs
│   │   │   └── goal-repository.ts      <-- Goal target tracking
│   │   ├── sync/
│   │   │   ├── mutation-queue.ts      <-- Offline mutation queue & SyncCollection
│   │   │   ├── sync-engine.ts         <-- Firestore synchronization & conflict resolution
│   │   │   └── backup-service.ts      <-- Full database JSON export/import
│   │   └── notifications/
│   │       └── notification-manager.ts <-- 72-hour rolling notification window calculator
│   ├── components/
│   │   ├── routine/
│   │   │   ├── today-timeline.tsx     <-- Daily schedule view
│   │   │   └── current-activity-card.tsx <-- Active routine block hero card
│   │   ├── calendar/
│   │   │   ├── week-view.tsx          <-- 7-day calendar view
│   │   │   └── month-view.tsx         <-- Monthly habit grid
│   │   └── navigation/
│   │       └── mobile-drawer.tsx      <-- Mobile drawer navigation tabs
│   └── app/
│       └── page.tsx                   <-- Main application controller & desktop tab bar
```

---

## 3. Existing Implementation & Behavior

### 3.1 Naming Distinction: Block vs Day Template
In the existing codebase (`src/types/routine.ts` lines 74–95), the interface named `RoutineTemplate` actually represents an **individual activity block** (e.g. "Wake up", "Meditation", "Fullmoon Styles"), containing `startTime`, `endTime`, `category`, and `recurrence`.

In user terminology and in Issue #6:
- A **Routine Block** is an individual timed activity.
- A **Routine Template** (or Day Routine Template) is a **named collection of routine blocks** (e.g. "Weekday Routine" with 21 blocks, or "Weekend Routine" with cycling and personal projects).

To maintain backward compatibility and preserve all existing APIs and tests without disruptive renames, we will define:
- `DayRoutineTemplate`: The parent day template containing an array of activity blocks (`blocks: RoutineTemplate[]`), metadata, and versioning.
- `WeeklyPlannerConfig`: Maps weekdays (`0` to `6`) to template IDs, with a default fallback and date-specific template overrides (`dateTemplateOverrides: Record<string, string>`).

### 3.2 Baseline Routine Blocks
In `src/lib/seed-data.ts`, `getInitialRoutineTemplates(userId)` defines the 21 baseline activities:
- `template_wake_up` (06:00 - 06:10)
- `template_meditation` (06:10 - 06:40)
- `template_journalling` (06:40 - 06:50)
- `template_yoga` (06:50 - 07:20)
- `template_keshav_prep` (07:20 - 08:20)
- `template_breakfast` (08:20 - 08:45)
- `template_client_calls` (08:45 - 09:30)
- `template_work_deep_1` (09:30 - 11:30)
- `template_movement_break_1` (11:30 - 11:45)
- `template_work_deep_2` (11:45 - 13:15)
- `template_lunch_walk` (13:15 - 14:00)
- `template_family_time` (14:00 - 15:00)
- `template_fullmoon_styles` (15:00 - 16:00)
- `template_work_collaborative` (16:00 - 17:30)
- `template_evening_fitness` (17:30 - 18:30)
- `template_bath_refresh` (18:30 - 19:00)
- `template_family_dinner` (19:00 - 20:00)
- `template_parenting_connection` (20:00 - 20:45)
- `template_keshav_bedtime` (20:45 - 21:15)
- `template_learning_reflection` (21:15 - 21:45)
- `template_night_prep_sleep` (21:45 - 22:00)

Notice `template_fullmoon_styles` (15:00 - 16:00) and `template_evening_fitness` (17:30 - 18:30) are already present in the baseline data.

### 3.3 Occurrence Generation & Precedence
In `src/lib/occurrence-generator.ts` (`generateDailyOccurrences`):
```ts
export function generateDailyOccurrences(
  templates: RoutineTemplate[],
  overrides: OccurrenceOverride[],
  logs: ActivityLog[],
  targetDate: string
): ActivityOccurrence[]
```
Currently, `templates` is passed as a flat list. When multiple routine templates are supported:
1. `DayTemplateResolver.resolveBlocksForDate(dateStr, weeklyPlanner, dayTemplates, fallback)` resolves which set of blocks applies to `targetDate`.
2. `generateDailyOccurrences` is called with those resolved blocks, plus any date-specific `OccurrenceOverride` objects and `ActivityLog` entries.
3. Crucially, lines 123–186 in `occurrence-generator.ts` already handle historical log recovery: if an activity log exists for an activity not present in today's active template (e.g. from an older template or archived activity), it is preserved and rendered accurately in historical analytics!

### 3.4 72-Hour Notification Rolling Schedule
In `src/lib/notifications/notification-manager.ts` (`compute72HourSchedule`):
```ts
const dates = [baseDate, addDays(baseDate, 1), addDays(baseDate, 2)];
for (const dateStr of dates) {
  const occurrences = generateDailyOccurrences(activeTemplates, overrides, logs, dateStr);
  ...
}
```
Currently, the exact same `activeTemplates` array is used for all three days. When day-based assignment is active:
- Each date in `[baseDate, baseDate + 1, baseDate + 2]` dynamically resolves its own day template (e.g., Friday uses Weekday Routine, Saturday and Sunday use Weekend Routine).
- This ensures weekend alarms (like cycling or Fullmoon Styles) are scheduled properly for Saturday/Sunday without bleeding into weekdays.

### 3.5 Backup and Restore Integration
In `src/lib/sync/backup-service.ts`:
```ts
export interface RoutineBackupPackage {
  version: '1.0';
  exportedAt: string;
  userId: string;
  templates: RoutineTemplate[];
  overrides: OccurrenceOverride[];
  logs: ActivityLog[];
  goals: GoalTarget[];
  lifeGoals?: LifeGoal[];
}
```
We can extend `RoutineBackupPackage` with optional fields:
```ts
dayTemplates?: DayRoutineTemplate[];
weeklyPlanner?: WeeklyPlannerConfig;
```
When importing legacy v1.0 backups that lack `dayTemplates`, the system automatically synthesizes the default "Weekday Routine" from `data.templates` so no legacy backups ever fail.

---

## 4. Data Flow & Integration Architecture

```
                                  ┌──────────────────────────┐
                                  │   DayRoutineTemplate[]   │
                                  │ (Weekday, Weekend, etc.) │
                                  └─────────────┬────────────┘
                                                │
                                                ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   targetDate (YYYY-MM-DD)├─────►│   DayTemplateResolver    │
│  (Resolved in Asia/Kolkata)     │                          │
└──────────────────────────┘      │ Precedence Engine:       │
                                  │ 1. Date Template Override│
┌──────────────────────────┐      │ 2. Weekday Assignment    │
│   WeeklyPlannerConfig    ├─────►│ 3. Default Fallback      │
│ (Mon-Fri -> Wkday,       │      └─────────────┬────────────┘
│  Sat-Sun -> Wkend)       │                    │ Resolves blocks
└──────────────────────────┘                    ▼
                                  ┌──────────────────────────┐
                                  │generateDailyOccurrences()│◄── OccurrenceOverride[]
                                  └─────────────┬────────────┘◄── ActivityLog[]
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
          ┌──────────────────────────┐                    ┌──────────────────────────┐
          │  Today Schedule View &   │                    │  NotificationManager &   │
          │ Conflict Overlap Warning │                    │  72-Hr Rolling Scheduler │
          └──────────────────────────┘                    └──────────────────────────┘
```

---

## 5. Potential Regressions & Mitigations

1. **Regression Risk 1: Historical Log Loss on Template Switch**
   - *Risk*: Switching a weekday to a weekend template might cause weekday activities from previous weeks to disappear from history.
   - *Mitigation*: `occurrence-generator.ts` already contains fallback log recovery (lines 123–186). We will write dedicated regression tests ensuring that past days retain their full log history regardless of template reassignments.
2. **Regression Risk 2: Overrides Collision**
   - *Risk*: An `OccurrenceOverride` tied to `template_meditation` on `2026-10-24` might malfunction if a different template has a block with the same ID or omits it.
   - *Mitigation*: Overrides are keyed by `templateId_date`. If a block is not in today's active template, an override is gracefully skipped unless an activity log exists.
3. **Regression Risk 3: Accidental Mutation of Master Weekly Template**
   - *Risk*: User wants to adjust today's hours and accidentally modifies the weekly recurring template.
   - *Mitigation*: Clear UI separation:
     - Changing today's schedule applies a **Date-Specific Template Assignment** (or date override).
     - Editing the template definition modifies the master template.
     - Confirmation dialogs explicitly display the scope of the change.

---

## 6. Recommended Approach Supported by Evidence

1. **Create `src/types/routine-templates.ts`**:
   Define `DayRoutineTemplateSchema`, `WeeklyPlannerConfigSchema`, and `DayTemplateImportPackageSchema` with Zod validation.
2. **Create `src/lib/repositories/day-template-repository.ts`**:
   Follow `RoutineRepository` pattern: `localStorage` caching + Firestore synchronization under `users/{userId}/day_templates` and `users/{userId}/weekly_planner`.
3. **Create `src/lib/templates/day-template-resolver.ts`**:
   Deterministic resolution engine implementing the 4-tier precedence model.
4. **Create `src/components/templates/` UI suite**:
   - `templates-management-view.tsx`: Cards for each template, block count, total duration, actions (create, edit, duplicate, rename, export, delete, preview).
   - `weekly-planner-view.tsx`: Mon–Sun 7-day card grid, template selector, "Copy Mon to Weekdays", "Copy Sat to Sun", preview drawer.
   - `template-editor-modal.tsx`: Edit template title, description, and configure routine blocks.
   - `template-import-dialog.tsx`: File drop/upload, Zod validation, error summary, preview, and collision resolution.
   - `apply-template-dialog.tsx`: Select scope ("Today only", "Date range", "Set as weekly default").
5. **Update Navigation**:
   Add a `Templates & Planner` navigation tab in desktop header (`src/app/page.tsx`) and mobile drawer (`src/components/navigation/mobile-drawer.tsx`).
6. **Update Today View**:
   Display active template name badge in `TodayTimeline` with a quick-switch popover.
7. **Extend `BackupService`**:
   Add `dayTemplates` and `weeklyPlanner` to backup export/import while maintaining compatibility with legacy v1.0 backups.
