# Implementation Report: Remove Unwanted Seed Goals and Make Goal Sections Collapsible

**Task ID**: `bug-014-remove-unwanted-seed-goals`  
**GitHub Issue**: [#14](https://github.com/yogeshpm89/my-routine/issues/14)  
**Branch**: `bugfix/issue-14-remove-unwanted-seed-goals`  
**Date**: 2026-10-28  
**Author**: Antigravity Assistant  
**Status**: Completed  

---

## 1. Executive Summary

This task resolved GitHub Issue #14 ("goals popup in my life goals section, I never added these") and delivered the user-requested UI enhancement to make life goal cards and phase roadmaps collapsible.

1. **Unwanted Seed Goal Removal**:
   - Production life goals now initialize with an empty list (`[]`) via [getInitialLifeGoals](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts#L4-L7).
   - Automated migration via [LifeGoalRepository.purgeLegacySeedGoals](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts#L83-L122) purges legacy seed IDs (`life_goal_read_30_books`, `life_goal_genai_course`, `life_goal_lose_5kg`) from `localStorage`, pending `MutationQueue`, and Cloud Firestore.
   - Preserves rich goal structures in [getSampleLifeGoals](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts#L9-L30) with safe `sample_goal_` identifiers for unit tests, fixtures, and optional templates.

2. **Collapsible Goal Card Sections & Roadmap Accordion**:
   - **Card-level collapse**: Added a minimize/expand toggle in the goal card header with `ChevronUp` / `ChevronDown` icons. Collapsing reduces the card to a compact summary bar (~120px) showing category badge, status, progress bar, and completion summary while hiding tabs, sub-navigation, and motivation quotes.
   - **Phase-level accordion**: Each phase in the Roadmap tab is an interactive accordion with `ChevronRight` (collapsed) and `ChevronDown` (expanded). By default, completed phases start collapsed to keep the view clean while active phases remain open.
   - **Roadmap header batch toggle**: Added an "Expand All / Collapse All" button in the Roadmap tab header allowing one-click toggling across all phases.

---

## 2. Technical Decisions & Rationale

| Decision | Rationale |
| :--- | :--- |
| **Purge at multiple layers (`localStorage`, `MutationQueue`, and Firestore)** | When an authenticated user connects, Firestore sync could re-inject legacy goals if not removed remotely. Purging remote documents and queue items prevents resurrection across multi-device sessions. |
| **Separate `getInitialLifeGoals` from `getSampleLifeGoals`** | Allows production users to start with zero uninvited mock data while preserving rich multi-phase, multi-list goal fixtures for automated tests and template previews. |
| **Smart phase collapse default (`isPhaseDone`)** | For users with extensive goals (such as 13 phases with 297 chapter steps), completed phases clutter the viewport. Defaulting completed phases to collapsed dramatically improves scannability while keeping active chapters front and center. |
| **Card collapse footer bar** | When collapsed, cards display a concise summary with a prominent "Show Details" button so users never lose context or wonder where the roadmap went. |

---

## 3. Performance Characteristics

- **Zero-allocation state management**: Card and phase collapse states are tracked using shallow dictionary maps (`Record<string, boolean>`) keyed by `goalId` and `${goalId}_${phaseId}`.
- **Render performance**: Collapsed phases avoid mounting long step DOM trees (e.g. 297 checkboxes), reducing initial render overhead and paint cycles on mobile and desktop browsers.
- **Sync efficiency**: Filtering `LEGACY_SEED_GOAL_IDS` occurs during local retrieval, avoiding redundant serialization passes.

---

## 4. Verification & Quality Assurance

### 4.1 Unit Tests
Executed via Vitest:
```bash
npx vitest run src/lib/repositories/life-goals.test.ts
```
**Results**:
- **27 passed** (27 total tests in `src/lib/repositories/life-goals.test.ts`), 0 failures.
- Verified:
  1. `getInitialLifeGoals(userId)` returns `[]`.
  2. `LifeGoalRepository.getLocalLifeGoals(userId)` returns `[]` on fresh state.
  3. `LifeGoalRepository.purgeLegacySeedGoals(userId)` strips `life_goal_read_30_books`, `life_goal_genai_course`, `life_goal_lose_5kg`.
  4. User custom goals (e.g. `user_custom_goal_marathon`) are strictly preserved.
  5. Checklist items, comments, activity logs, and undo functionality remain fully operational.

### 4.2 Production Build
Executed via Next.js:
```bash
npm run build
```
**Results**:
- Next.js 16.4.1 (Turbopack) compiled cleanly in 1212ms.
- TypeScript check passed with 0 errors.
- 7/7 static pages generated successfully.

---

## 5. Modified Files

1. [`src/lib/seed-goals.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/seed-goals.ts):
   - `getInitialLifeGoals(userId)` returns `[]`.
   - `getSampleLifeGoals(userId)` exports sample fixtures using `sample_goal_` IDs.
2. [`src/lib/repositories/life-goal-repository.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goal-repository.ts):
   - Exported `LEGACY_SEED_GOAL_IDS`.
   - Added `purgeLegacySeedGoals(userId)`.
   - Filtered legacy IDs from local reads, remote loads, and real-time listeners.
3. [`src/lib/sync/backup-service.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sync/backup-service.ts):
   - Updated `resetToDefaultRoutine` to trigger `purgeLegacySeedGoals`.
4. [`src/components/goals/goals-dashboard.tsx`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/goals/goals-dashboard.tsx):
   - Added card collapse toggle with `ChevronUp`/`ChevronDown`.
   - Added compact collapsed card footer with progress summary.
   - Added Roadmap tab "Expand All / Collapse All" button.
   - Added phase-level accordion with `ChevronRight`/`ChevronDown` and smart defaults.
5. [`src/lib/repositories/life-goals.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/repositories/life-goals.test.ts):
   - Added tests for empty default state and legacy seed purging.
   - Updated test fixtures to use `getSampleLifeGoals`.
