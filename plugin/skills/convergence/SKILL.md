---
name: convergence
description: Compare final implementation and verification evidence against original requirements, acceptance criteria, and task commitments to guarantee zero specification drift. Use after implementation and the three-subagent review gate, prior to documentation and completion.
---
# Specification convergence

## Purpose
Ensure that what was built strictly converges with what was requested. Validate that all features,
rules, acceptance criteria, and tasks are fulfilled without architectural drift or scope creep.

## Trigger
Full lane, immediately following the completion and passing of the review gate (`validator`,
`code-reviewer`, `security-auditor`), before documentation. Also used in a scoped manner in the quick lane.

## Inputs
- `REQUIREMENTS.md` (features, rules, acceptance criteria, reference transcription).
- `PLAN.md` (approved approach, Reuse/Modify/Create/Avoid commitments).
- `TASKS.md` (planned task list T001..Tnnn).
- `VALIDATION.md`, `REVIEW.md`, `SECURITY.md` (test and review evidence).
- `git diff` against the base commit.

## Process
1. **Audit requirements convergence**:
   - Trace each feature item (F1, F2...) to its implementation location (`file:line`).
   - Confirm every business rule (R1, R2...) is actively enforced in code.
   - Verify every acceptance criterion (AC1, AC2...) has direct passing test evidence cited in
     `VALIDATION.md`.
2. **Audit task completion**:
   - Check off each task from `TASKS.md` (T001..Tnnn).
   - Ensure no task was left partially completed, skipped, or quietly abandoned.
3. **Detect drift and unintended scope**:
   - **Architecture drift**: Inspect the diff to confirm all added files match the approved
     folders, layers, and dependency arrows. Confirm no items marked `Avoid` were added.
   - **Scope creep**: Identify any files, dependencies, endpoints, or props added outside the
     approved plan and tasks.
   - **Integrity**: Confirm no unrelated files were touched, reformatted, or refactored.
4. **Evaluate convergence result**:
   - If missing requirements, unverified criteria, or unapproved drift are detected:
     - Minor/remediable: perform inline remediation, re-run validation, and re-evaluate.
     - Material divergence: show the `Validation failed` / `STOP` menu from AGENTS.md §8.
   - When all requirements converge cleanly, record `PASS (CONVERGED)`.
5. Format the audit using `.agent/templates/CONVERGENCE.md` and save as
   `.agent/work/<id>/CONVERGENCE.md`.

## Output
`CONVERGENCE.md` documenting the requirement-to-code mapping, task execution log, drift analysis,
and overall convergence verdict (`CONVERGED` or `DRIFT DETECTED`).

## Guardrails
- Convergence requires factual code references (`path:line`) and test results; assumptions are disallowed.
- Never mark a feature or acceptance criterion as converged if its supporting test was not run.
- Zero tolerance for silent architecture drift.

## Stop conditions
- Material discrepancy between approved specification and the actual build that cannot be fixed
  without plan modification. Invoke the scope change STOP menu.
