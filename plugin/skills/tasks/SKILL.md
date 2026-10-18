---
name: tasks
description: Break an approved implementation plan into actionable, dependency-aware tasks and execute a pre-implementation consistency check across specifications, plans, tasks, and architecture. Use after planning and architecture review, before implementation approval.
---
# Implementation tasks & consistency check

## Purpose
Convert the implementation plan into an ordered, dependency-aware execution checklist (`TASKS.md`)
and verify consistency across requirements, plan, tasks, and architecture before code is written.

## Trigger
Full lane, immediately following the drafting of `PLAN.md` in Plan mode, prior to presenting the
approval gate.

## Inputs
- `REQUIREMENTS.md` (features, rules, acceptance criteria).
- `CODEBASE_CONTEXT.md` (existing patterns, layers, tooling commands).
- `PLAN.md` (approach, Reuse/Modify/Create/Avoid, steps, data changes).

## Process
1. **Decompose plan steps into actionable tasks**:
   - Assign identifiers: `T001`, `T002`, `T003`...
   - Order strictly by architectural dependency:
     1. Database schema, migrations, seed data (if any).
     2. Domain entities, models, DTOs.
     3. Backend services, repository methods, API endpoints.
     4. Automated backend tests (unit, integration).
     5. Frontend state, API client hooks, service integrations.
     6. Frontend UI components, forms, validation, views.
     7. Frontend UI / end-to-end tests.
     8. Validation gate execution.
   - For every task, explicitly declare:
     - Title and concrete action description;
     - Touched target files (`path/to/file`);
     - Prerequisite task IDs (`[Prereq: none]` or `[Prereq: T001]`);
     - Verification command or check (`[Verify: npm test ...]` or `[Verify: dotnet test ...]`).
   - Keep tasks meaningful: avoid empty setup chores or microscopic tasks (e.g., "create directory").
2. **Execute the pre-implementation consistency check**:
   Compare the 4 dimensions:
   - **Requirements ↕ Tasks**: Every feature (F1, F2...) and acceptance criterion (AC1, AC2...) maps
     to at least one concrete implementation task and test task.
   - **Plan ↕ Tasks**: Every step in `PLAN.md` has corresponding tasks; no tasks introduce items
     marked `Avoid`.
   - **Architecture ↕ Tasks**: Layers and dependency directions follow the audit (UI → API client →
     endpoint → service → data). No forbidden cross-boundary leaps.
   - **Database & Safety ↕ Tasks**: Any schema change includes migration, backfill, and rollback
     considerations.
3. If any inconsistency, missing test, or unmapped requirement is discovered, update the plan and
   tasks before presenting to the developer.
4. Format the output using `.agent/templates/TASKS.md` and append or write to
   `.agent/work/<id>/TASKS.md`. In Cursor Plan mode, include the task list directly in the plan.
5. Conclude the planning phase with the Human Approval gate (AGENTS.md §6).

## Output
`TASKS.md` containing the ordered task breakdown and the 5-dimension consistency check matrix.

## Guardrails
- Every task must be self-contained and independently verifiable.
- Never omit testing tasks: any task creating or modifying business logic requires a paired test task.
- Tasks must not expand scope beyond the approved requirements and plan.

## Stop conditions
- A required task violates an existing architectural constraint or recorded decision. Halt and
  report the conflict to the developer.
- Acceptance criteria cannot be mapped to feasible automated verification. Clarify criteria first.
