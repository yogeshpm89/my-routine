# Feature-010: Life Goals Small Milestones & Phase Step-Level Progress Tracking

## 1. Executive Summary

- **Task ID**: `feature-010-life-goal-milestones-and-steps`
- **Task Title**: Life Goals Small Milestones & Phase Step-Level Progress Tracking
- **Category**: Feature Enhancement
- **Target Branch**: `feature/feature-010-life-goal-milestones-and-steps`
- **Starting Version**: `1.5.0` (`versionCode: 8`)
- **Target Version**: `1.6.0` (`versionCode: 9`)
- **Documentation Date**: 2026-10-27
- **Current Status**: **AWAITING USER APPROVAL**

---

## 2. Background & Objective

In **My Routine**, users manage long-term personal and professional life goals (e.g., *Master Generative AI & Agentic Workflows*, *Run a Half Marathon*, *Launch SaaS MVP*, *Learn Conversational Japanese*). Under each goal, users can select how to track progress across several modes:
1. **Tasks & Checklist** (`tasks`)
2. **Roadmap & Phases** (`phases`)
3. **Target Metric** (`metric`)
4. **Routine & Habit Streaks** (`habits`)
5. **Open Journey / Journal** (`journey`)
6. **Detailed Tracked Items** (`items`)

However, two major gaps limit user momentum and progress accuracy:
1. **Missing Small Milestones Option**:
   - Many life goals advance through key intermediate checkpoints or small milestones (e.g., *Draft syllabus*, *Deploy first prototype*, *First 10 beta signups*, *Pass practice exam*).
   - Currently, there is no option in the "Select How to Track Progress" modal to choose a dedicated Milestones tracking model, nor is there any UI in `GoalEditorModal` or `GoalsDashboard` to define, manage, or view small milestones on goal cards.
2. **Roadmap & Phases Tracking at Phase Level Instead of Step Level**:
   - When a goal uses the **Roadmap & Phases** tracking mode, progress is currently calculated solely by counting completed *phases* (`phases.filter(p => p.status === 'completed').length / phases.length`).
   - If a phase contains 6 tangible deliverable steps, completing 5 out of 6 steps provides **0% progress** on the goal's overall progress bar until the entire phase is checked off.
   - Users need progress in Roadmap & Phases to track at the **individual step level across phases**, so every completed step visibly moves the user closer to the final goal.

### Objective
1. Add a first-class **Key Milestones & Steps** tracking model in the tracking mode picker, with complete UI support in both the Goal Editor and Goals Dashboard to add, view, toggle, and delete small milestones.
2. Update **Roadmap & Phases** progress calculation so that goal advancement is measured by completed **steps (tasks) within each phase**, automatically updating phase completion states and giving immediate visual feedback on the main goal progress bar.

---

## 3. Real-World User Scenarios

1. **AI Engineering Roadmap**:
   - A user has a goal *Master Generative AI* with 4 phases (Foundations, Prompt Engineering, RAG, Autonomous Agents). Phase 1 has 3 steps (*Read Vaswani paper*, *Implement nano-GPT*, *Run test inference*).
   - Completing the first step immediately advances the goal from 0% to 8% (1 of 12 total steps across all phases). The phase card displays `1/3 steps done` with a mini progress bar.
   - When all 3 steps of Phase 1 are marked done, Phase 1 automatically marks as completed (`Phase 1 Done ✓`).
2. **SaaS Product Launch Milestones**:
   - A user creates a goal *Launch B2B Micro-SaaS in 90 Days* and selects the **Key Milestones & Steps** tracking mode.
   - They define 5 small milestones: *Landing page live*, *Stripe billing integrated*, *Core MVP functional*, *10 user interviews*, *Product Hunt launch*.
   - In `GoalsDashboard`, a dedicated **Milestones** tab displays all 5 checkpoints with target dates. As each milestone is checked off, progress advances by 20% (1/5, 2/5, 3/5...).
   - The user can also add a new small milestone directly from the goal card using the inline input without opening the full editor modal.

---

## 4. Core Principles

1. **Every Step Counts**: Incremental effort (completing a step in a phase or checking off a small milestone) must immediately advance the parent goal's progress bar.
2. **Harmonious Phase Automation**: When all steps in a phase are checked, the phase marks completed automatically. If a step is un-checked, it gracefully reverts to in-progress.
3. **Graceful Fallbacks**: If a phase does not have individual steps defined yet, the phase itself counts as 1 deliverable unit, avoiding any division-by-zero or stalled progress.
4. **Frictionless Quick Add**: Allow users to add small milestones and phase steps directly on the goal card in `GoalsDashboard` with 1 tap/enter.
5. **Zero Data Loss & Backward Compatibility**: Existing goals in LocalStorage and Firestore remain fully functional, and schemas strictly maintain optionality.

---

## 5. Acceptance Criteria

- [ ] **Data Model & Schema**:
  - `GoalTrackingModeSchema` includes `'milestones'`.
  - `GoalMilestoneSchema` supports optional `description?: string` and `targetDate?: string`.
  - `GoalProgressLogSchema` supports attribution for milestones (`milestoneId`, `milestoneTitle`).
- [ ] **Step-Level Phase Progress**:
  - In `LifeGoalRepository.recalculateGoalProgress`, when `trackingMode === 'phases'`, total units = total steps across phases (phases without steps count as 1 unit), and current units = completed steps across phases.
  - Toggling a phase step (`togglePhaseTask`) recalculates goal progress and auto-updates the phase status to `completed` when all steps in that phase are finished.
- [ ] **Small Milestones Management**:
  - Implement `addMilestone`, `deleteMilestone`, `updateMilestone`, and enhanced `toggleMilestone` in `LifeGoalRepository`.
  - When `trackingMode === 'milestones'`, `targetValue` = milestone count and `currentValue` = completed milestone count.
- [ ] **UI in Goal Editor Modal**:
  - "Select How to Track Progress" contains the **Key Milestones & Steps** card with icon, title, and description.
  - Modal navigation tab includes **Milestones (N)** tab for defining small milestones with titles, target dates, and descriptions.
  - Phase step calculation correctly calculates step counts on save.
- [ ] **UI in Goals Dashboard**:
  - Goal cards feature a dedicated **Milestones** tab showing checkpoints, completion checkboxes, target dates, deletion, and an inline quick-add input.
  - Roadmap tab shows step-level completion badges (`X/Y Steps Completed`) and mini step progress bars per phase.
  - Main goal progress bar and statistics reflect step-level or milestone-level progress.
- [ ] **Testing & Quality Assurance**:
  - Automated unit tests in `src/lib/repositories/life-goals.test.ts` covering step-level phase progress, auto-completion, milestone CRUD, and tracking mode calculations.
  - Zero TypeScript, lint, or build errors (`npm run build:web`).
