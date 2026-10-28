# Approval Request: Life Goals Small Milestones & Phase Step-Level Progress Tracking

## 1. Task Summary

- **Task ID**: `feature-010-life-goal-milestones-and-steps`
- **Task Title**: Life Goals Small Milestones & Phase Step-Level Progress Tracking
- **Category**: Feature Enhancement
- **Target Branch**: `feature/feature-010-life-goal-milestones-and-steps`
- **Starting Version**: `1.5.0` (`versionCode: 8`)
- **Target Version**: `1.6.0` (`versionCode: 9`)
- **Documentation Date**: 2026-10-27
- **Current Status**: **AWAITING USER APPROVAL**

---

## 2. Problem Being Solved

1. **Tracking Step Progress Closer to the Final Goal**:
   - In **Roadmap & Phases** tracking mode, progress is currently calculated solely by completed *phases* (e.g. 1/4 phases done = 25%). If a phase has 6 steps, completing individual steps does not move the parent goal's progress bar at all.
   - Users need progress in Roadmap & Phases to track at the **individual step level across phases**, so every single completed step immediately moves the goal closer to the final target.
2. **Options for Small Milestones**:
   - Many life goals advance via key intermediate checkpoints (e.g. *Finish prototype*, *Complete user interview 1*, *Launch beta*).
   - Currently, there is no option in the "Select How to Track Progress" modal (shown in your screenshot) for a dedicated Milestones tracking model, nor is there any UI to add or view small milestones on goal cards.
   - Users need to be able to select **Key Milestones & Steps** as a tracking mode, add small milestones with target dates, toggle them off as completed, and add new milestones directly on the goal card.

---

## 3. Key Design Decisions

1. **Step-Level Phase Progress**:
   - For goals in `phases` tracking mode, progress is measured across all steps in all phases (`currentValue` = completed steps, `targetValue` = total steps).
   - Phases without sub-steps safely count as 1 deliverable unit.
   - When all steps in a phase are checked, the phase marks as completed automatically.
2. **First-Class Milestones Tracking Mode & Management**:
   - Added `'milestones'` to `GoalTrackingModeSchema`.
   - Added the **Key Milestones & Steps** card into the "Select How to Track Progress" grid with an intuitive icon and description.
   - Added a **Milestones** tab in `GoalEditorModal` to manage milestones during creation/editing.
   - Added a **Milestones** tab on goal cards in `GoalsDashboard` with instant checkbox toggling, target dates, and an inline quick-add input to add small milestones on the fly.
3. **Harmonious Parent Roll-Up**:
   - Completing a milestone or a phase step immediately advances the goal's main progress bar and status.
4. **Zero Schema Breakage**:
   - Backward-compatible extension to `GoalMilestoneSchema` and `GoalTrackingModeSchema`.
   - Full support for offline `localStorage` and Firestore synchronization.

---

## 4. Main Files Expected to Change

| File Path | Action | Description |
|---|---|---|
| `src/types/goals.ts` | **Modify** | Add `'milestones'` to `GoalTrackingModeSchema`, extend `GoalMilestoneSchema` (`description`, `targetDate`). |
| `src/lib/repositories/life-goal-repository.ts` | **Modify** | Step-level calculation in `recalculateGoalProgress`, phase auto-completion in `togglePhaseTask`, add `addMilestone` & `deleteMilestone`. |
| `src/components/goals/goal-editor-modal.tsx` | **Modify** | Add Key Milestones option in Tracking Mode tab, add Milestones management tab, compute step targets on submit. |
| `src/components/goals/goals-dashboard.tsx` | **Modify** | Add interactive Milestones tab with quick add, show step completion in Roadmap tab & per-phase mini progress bars. |
| `src/app/page.tsx` | **Modify** | Implement `handleAddGoalMilestone` and `handleDeleteGoalMilestone` handlers and wire to dashboard. |
| `src/lib/repositories/life-goals.test.ts` | **Modify** | Unit tests for phase step-level progress calculation, milestone CRUD, and tracking mode updates. |
| `package.json` & `public/version.json` | **Modify** | Bump version to `1.6.0` (`versionCode: 9`) with release notes. |

---

## 5. Verification & Testing Plan

1. **Automated Unit Tests**:
   - Run `npx vitest run src/lib/repositories/life-goals.test.ts` to verify step-level phase calculation, auto-completion, milestone CRUD, and progress roll-up.
2. **Type Safety & Build Verification**:
   - Run `npm run build:web` to ensure zero compilation or lint errors.
3. **Manual Flow Verification**:
   - Test checking steps in a phase -> verify parent goal progress bar moves forward.
   - Test adding small milestones to a goal -> toggle milestone -> verify progress advances.

---

## 6. Request for Approval

In accordance with the project workflow:
> **No application code, tests, or git branches will be modified until you explicitly review and approve this plan.**

Please confirm if you approve the creation of branch `feature/feature-010-life-goal-milestones-and-steps` and the execution of this plan.
