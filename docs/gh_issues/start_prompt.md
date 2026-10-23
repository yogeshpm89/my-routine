# Antigravity Prompt: My Routine — Documentation-First Development and Approval-Gated Implementation Workflow

## 1. Objective

Establish a structured, documentation-first engineering workflow for developing and maintaining the **My Routine — Adaptive Schedule & Focus Engine** application.

Repository:

`W:\Users\YogeshMurdeshwar\projects\self\my-routine`

If this path is incorrect or unavailable, inspect the current Antigravity workspace and identify the actual repository root. Do not assume the path exists.

The application currently uses:

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Firebase Authentication and Cloud Firestore
- Capacitor for Android
- Native local notifications
- Offline-first persistence and synchronization
- Routine scheduling, goal tracking, analytics, and conflict detection
- Amazfit smartwatch notification mirroring through Zepp

Verify the current technology stack and versions from the actual repository before relying on these details.

### Primary objective

Create a reusable engineering workflow for implementing new features, fixing bugs, improving existing functionality, and maintaining the application.

Every significant task must follow this lifecycle:

**Request → Investigation → Requirements → Implementation Plan → User Approval → Implementation → Testing → Documentation → Completion Report**

The workflow must prevent accidental implementation before the user reviews and approves the plan.

## 2. Mandatory Approval Gate

**Do not implement any feature or bug fix until I have reviewed and explicitly approved the implementation plan.**

During the initial phase, only inspect the repository and create or update the designated task documentation.

Do not modify:

- Application source code.
- Existing tests.
- Dependencies or lockfiles.
- Application configuration.
- Database schemas or production data.
- Android native implementation files.
- Notification settings or scheduling logic.
- Existing application documentation outside the designated task folder, except when explicitly authorized.

Do not commit, push, create pull requests, or deploy.

The only permitted modifications before approval are the documentation files belonging to the task being investigated.

If the task description is ambiguous, record the ambiguity and ask questions rather than silently inventing requirements.

After preparing the documentation, stop and present the approval summary.

## 3. Task Documentation Structure

Create a central task documentation directory if one does not already exist:

`docs/tasks/`

Use a dedicated folder for every task:

`docs/tasks/<TASK_ID>/`

Examples:

- `docs/tasks/feature-001-minute-level-goal-progress/`
- `docs/tasks/feature-002-routine-templates/`
- `docs/tasks/bug-001-mobile-speedometer-gps/`
- `docs/tasks/feature-003-app-icon-update/`

Use an existing task or issue identifier when one is available. Otherwise, generate a stable, descriptive identifier and verify that it does not conflict with an existing folder.

Do not reuse a task folder for an unrelated feature.

If the repository already has an established documentation structure for engineering tasks, inspect it first and reuse it where practical rather than creating a competing structure.

### Required task documents

Each task folder must contain:

1. `README.md` — Task overview, requirements, scope, and acceptance criteria.
2. `investigation.md` — Findings from the current codebase.
3. `plan.md` — Detailed implementation and testing plan.
4. `approval.md` — Proposed changes and explicit approval status.
5. `implementation-report.md` — Actual implementation results, created only after approval and when implementation begins.

During the initial phase, create only the first four documents.

## 4. Phase 1 — Understand the User Request

Read the complete task description provided in the conversation.

If the task originates from a GitHub issue, retrieve its actual details using an available authenticated GitHub integration or supported local tooling.

If the task comes from an uploaded document, screenshot, or other reference, inspect that source and preserve its relevant requirements.

Identify:

- The problem being solved.
- Why it matters.
- Expected user experience.
- Existing behavior that must be preserved.
- Explicit functional requirements.
- Relevant non-functional requirements.
- Dependencies on other features.
- Potential risks and regressions.
- Missing information.
- Decisions requiring user input.

Distinguish between:

1. Requirements explicitly stated by the user.
2. Findings verified in the repository.
3. Assumptions.
4. Engineering recommendations.
5. Open questions requiring user decisions.

Do not treat assumptions or recommendations as approved requirements.

For a bug report, identify the expected behavior, observed behavior, reproduction conditions, and potential root causes.

For a new feature, identify user journeys, state changes, persistence requirements, and integration points.

## 5. Phase 2 — Create the Task README

Create:

`docs/tasks/<TASK_ID>/README.md`

Include these sections.

### A. Task metadata

- Task ID.
- Task title.
- Task type: feature, bug fix, refactor, enhancement, or maintenance.
- Source request or issue URL, if available.
- Date documentation was prepared.
- Current workflow stage.
- Approval status.

### B. Problem statement

Explain the current problem and desired outcome.

### C. Current behavior

Document only behavior verified from repository evidence.

For bug fixes, include reproduction steps and observed errors where available.

### D. Expected behavior

Describe the required behavior in testable terms.

### E. Functional requirements

Assign stable identifiers:

- FR-001
- FR-002
- FR-003

Each requirement must describe one clear, testable behavior.

### F. Non-functional requirements

Include applicable requirements for:

- Performance.
- Reliability.
- Accessibility.
- Security and authorization.
- Responsive behavior.
- Offline operation.
- Data integrity.
- Backward compatibility.
- Battery usage.
- Maintainability.

Include only those relevant to the task.

### G. Acceptance criteria

Assign identifiers such as AC-001, AC-002, and AC-003.

Use concrete assertions or Given/When/Then scenarios.

### H. Scope

Separate:

- In scope.
- Out of scope.
- Optional future improvements.

### I. Dependencies and open questions

Document dependencies, assumptions, and unresolved decisions.

### J. Requirement traceability

Map requirements to acceptance criteria, planned implementation tasks, and tests.

## 6. Phase 3 — Investigate the Existing Codebase

Inspect the actual repository before proposing implementation changes.

Review the relevant areas, including:

### Application architecture

- Next.js routes and layouts.
- React components and hooks.
- TypeScript models and schemas.
- Domain logic and utility functions.
- State management.
- Existing error handling.

### Routine scheduling

- Routine block definitions.
- Recurrence rules.
- Occurrence generation.
- Date-specific overrides.
- Conflict detection.
- Timezone handling.
- Weekday and weekend scheduling.

### Goals and analytics

- Goal definitions and targets.
- Progress tracking.
- Actual-duration records.
- Daily and weekly analytics.
- Goal deficit detection.
- Prevention of duplicate progress counting.

### Persistence and synchronization

- Local persistence.
- Offline guest mode.
- Mutation queues.
- Firestore synchronization.
- Conflict resolution.
- Data migration.
- JSON backup and restore.

### Notifications and mobile integration

- Capacitor configuration.
- Android project structure.
- Local notification scheduling.
- Permission handling.
- Notification actions.
- Quiet hours.
- Rolling notification windows.
- Amazfit/Zepp notification integration.

### Quality and delivery

- Unit and integration tests.
- Type checking and linting.
- Production build.
- Android build.
- Environment variables.
- Deployment workflow.
- Existing architecture documentation.

Investigate only the areas relevant to the current task, but follow dependencies far enough to understand the impact of the proposed changes.

Do not claim that a file, feature, dependency, or test exists without verifying it.

### Investigation document

Create:

`docs/tasks/<TASK_ID>/investigation.md`

Include:

1. Repository structure relevant to the task.
2. Existing implementation and behavior.
3. Relevant files, components, functions, and models.
4. Reusable utilities and services.
5. Data flow and integration points.
6. Existing tests and missing coverage.
7. Compatibility constraints.
8. Potential regressions.
9. Technical risks.
10. Recommended approach supported by repository evidence.

Include file paths and relevant symbols. Include line references when useful.

If repository access is incomplete, document the limitation rather than guessing.

## 7. Phase 4 — Prepare the Implementation Plan

Create:

`docs/tasks/<TASK_ID>/plan.md`

The plan must be based on the investigation, not merely on a generic solution.

### A. Proposed solution

Explain the recommended approach and why it fits the existing architecture.

### B. Architecture and data flow

Describe the components involved and how information flows through the application.

Where applicable, explain:

- State changes.
- Domain logic.
- Persistence.
- API or Firebase interactions.
- Offline behavior.
- Error handling.
- UI updates.
- Notifications.
- Analytics.
- Data migration.

### C. Data model changes

Identify any required model, schema, or persistence changes.

Explain backward compatibility and how existing user data will be preserved.

Do not introduce a new source of truth when an existing model can support the feature safely.

### D. File-by-file implementation plan

Create a table:

| File or directory | Action | Purpose | Verification |
|---|---|---|---|
| Verified existing path | Modify | Explain required change | Relevant test |
| Proposed new path | Create | Explain responsibility | Relevant test |
| Existing test path | Extend | Explain coverage | Test command |

Mark uncertain file paths as provisional.

Do not modify these files before approval.

### E. Implementation phases

Break the work into small, independently verifiable phases.

For each phase, document:

- Objective.
- Tasks.
- Expected files changed.
- Dependencies.
- Validation steps.
- Completion criteria.

### F. Testing strategy

Specify applicable tests:

- Unit tests.
- Integration tests.
- UI interaction tests.
- Persistence tests.
- Offline and synchronization tests.
- Error handling tests.
- Regression tests.
- End-to-end tests.
- Physical Android device verification.

Identify which existing tests can be extended and which new tests are necessary.

### G. Migration and deployment

Document only the steps applicable to the task.

Consider schema migration, backup compatibility, configuration changes, Android synchronization, and rollback where necessary.

### H. Risks and mitigations

Identify the important risks and the actions that will mitigate them.

### I. Definition of done

Provide a checklist mapped to the acceptance criteria.

### J. Complexity

Estimate complexity as small, medium, or large and explain the primary uncertainties.

Avoid false precision in time estimates.

## 8. Phase 5 — Prepare the Approval Document

Create:

`docs/tasks/<TASK_ID>/approval.md`

Include:

1. Task summary.
2. Problem being solved.
3. Expected behavior.
4. Proposed solution.
5. Important architectural decisions.
6. Main files expected to change.
7. Data model or persistence implications.
8. Testing strategy.
9. Key risks.
10. Open questions.
11. Acceptance criteria.
12. Scope exclusions.
13. Approval checklist.

End the document with:

**Status: AWAITING USER APPROVAL**

The document should provide enough information for the user to approve the implementation without needing to reconstruct the entire investigation.

## 9. Phase 6 — Stop and Request Approval

After creating the documentation:

1. Summarize the verified findings.
2. List the documentation files created.
3. Explain the proposed implementation.
4. Identify unresolved questions and assumptions.
5. Highlight any risky or irreversible changes.
6. Ask the user to approve the plan or request revisions.

Do not implement the feature at this stage.

Do not interpret a previous approval for another task as approval for the current task.

Do not treat the creation of the plan as authorization to proceed.

**Stop and wait for an explicit response from the user.**

If the user requests changes, revise the documentation and request approval again.

## 10. Phase 7 — Implement After Approval

Begin this phase only after explicit approval of the current task's plan.

### A. Record approval

Update `approval.md` with:

- Approval status.
- Approval date.
- Any agreed changes.
- Approved scope.

### B. Inspect the working tree

Before editing code:

- Inspect Git status.
- Preserve unrelated user modifications.
- Review the current branch.
- Follow the repository's established branching conventions.
- Avoid overwriting uncommitted changes.

Do not commit, push, create a pull request, or deploy without the appropriate authorization.

### C. Implement in approved phases

For each implementation phase:

1. Follow the approved plan.
2. Make focused changes.
3. Reuse existing architecture and conventions.
4. Update relevant tests.
5. Run appropriate checks.
6. Review the diff.
7. Update task documentation.
8. Confirm that unrelated functionality remains intact.

If implementation reveals a significant architectural issue or requires scope expansion, stop and explain the proposed deviation before proceeding.

Do not make unapproved destructive changes or introduce unnecessary dependencies.

### D. Validate the implementation

Run applicable commands from the actual repository, such as:

- TypeScript checks.
- Linting.
- Unit tests.
- Integration tests.
- Production build.
- Capacitor synchronization.
- Android compilation.
- Relevant device-level checks.

Determine the actual commands from `package.json`, project configuration, and existing documentation.

Report actual outcomes. Never claim that a command passed unless it was executed successfully.

If a check cannot run, explain why and distinguish verified results from unverified behavior.

## 11. Phase 8 — Maintain Implementation Documentation

Update the task documentation throughout implementation.

### README.md

Track acceptance criteria and their completion status.

### investigation.md

Update findings when implementation reveals new facts.

### plan.md

Record completed phases, actual file changes, and deviations from the approved approach.

### approval.md

Maintain the approval record and final status.

### implementation-report.md

Create this document once implementation begins.

Include:

- Files created and modified.
- Implemented behavior.
- Requirement-to-implementation mapping.
- Tests executed and actual results.
- Production build results.
- Android build results, where applicable.
- Deviations from the approved plan.
- Known limitations.
- Migration and deployment instructions.
- Rollback instructions, where applicable.
- Remaining work.

## 12. Phase 9 — Completion Report

After implementation and verification, provide a concise report containing:

1. Task ID and title.
2. Summary of the implemented behavior.
3. Documentation directory.
4. Main files changed.
5. Acceptance criteria satisfied.
6. Tests and build results.
7. Deviations from the approved plan.
8. Known limitations.
9. Remaining tasks.
10. Git status and branch information, when available.

Do not close external issues, push changes, or deploy without the required authorization.

## 13. Special Engineering Rules for My Routine

Because this application manages schedules, goals, local data, and device notifications, preserve the following principles throughout development.

### Scheduling integrity

- Use Asia/Kolkata consistently where the application requires local scheduling.
- Preserve recurrence and date-specific override semantics.
- Avoid generating duplicate occurrences.
- Preserve historical activity records when schedules change.

### Goal integrity

- Keep accumulated progress and target durations consistent.
- Avoid double-counting manually recorded progress and routine completion durations.
- Preserve historical daily and weekly analytics.

### Offline-first behavior

- Keep essential routine functionality available offline.
- Preserve local data during synchronization failures.
- Avoid duplicate mutations during retries.
- Maintain backward-compatible backup and restore behavior.

### Mobile reliability

- Respect Android permission requirements.
- Manage native resources and listeners safely.
- Preserve notification scheduling, quiet hours, and action handling.
- Avoid unnecessary background activity and battery consumption.

### User data safety

- Follow existing authentication and Firestore authorization patterns.
- Preserve user isolation.
- Validate imported JSON and synchronized data.
- Do not expose private routine information through logs or error messages.

Apply only the principles relevant to the current task.

## 14. Reusable Workflow for Future Requests

Use the same process for every significant new feature, enhancement, or bug fix.

Examples:

- Minute-level goal progress tracking.
- Multiple routine templates and weekday/weekend assignments.
- Mobile speedometer GPS reliability.
- Website and Android app icon updates.
- Notification scheduling improvements.
- Analytics enhancements.
- Offline synchronization fixes.

Each task must have its own documentation directory and approval record.

Do not reuse another task's assumptions or approval.

For small, explicitly authorized changes, follow the user's requested scope while still documenting material architectural or data risks where appropriate.

## 15. Begin Now

Start by inspecting the current My Routine repository and identifying the actual workspace path.

Do not implement any application changes.

If I have provided a specific task, investigate that task and create its documentation under:

`docs/tasks/<TASK_ID>/`

If no specific task has been provided, prepare the reusable workflow documentation itself, using an appropriately named task directory.

Create the requirements, investigation, implementation plan, and approval documents.

Finish by presenting the approval summary and waiting for my explicit approval before proceeding.