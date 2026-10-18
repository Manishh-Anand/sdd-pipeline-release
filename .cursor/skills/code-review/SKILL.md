---
name: code-review
description: Review a finished diff for correctness bugs, architecture fit, reuse, project coding standards, readability and test quality; write REVIEW.md with severity-ranked findings. Use after every implementation via the code-reviewer subagent (in parallel with validator and security-auditor), or when asked to "review this code/PR".
---
# Code review

## Purpose
Catch what passing tests don't: wrong logic, a misplaced layer, duplicated code, broken
conventions, and weak tests.

## Trigger
After implementation, in both lanes, as the `code-reviewer` subagent. It can also be run on
demand against any diff or branch.

## Inputs
- The diff (`git diff <base>`) plus the code connected to it: callers, callees and tests of each
  changed symbol.
- `PLAN.md` (the Reuse/Modify/Create/Avoid table) and `REQUIREMENTS.md`.
- The rules whose globs match each changed file.

## Process
1. Read each changed file in full, not just its hunks. Open the callers of every changed
   function.
2. Review the change on these axes, in order:
   1. **Correctness**: logic errors, edge cases (empty, null, boundaries, concurrency), error
      paths, async misuse, off-by-one, broken callers.
   2. **Architecture fit**: is each item in the layer and folder the plan approved? Do
      dependencies point the right way? Was anything that the plan marked as Avoid introduced
      anyway?
   3. **Reuse**: new code that duplicates an existing component, helper, service or DTO. Name
      the existing one.
   4. **Standards**: violations of the matching rules. Cite the rule file and its bullet.
   5. **Tests**: does each test assert behaviour? Would it fail if the code were broken? Are the
      risky branches covered?
   6. **Simplicity**: dead code, needless abstraction, unrequested options, unclear names.
3. Report only real findings. For each one, say *why* it matters and give a concrete fix.
   Leave pure style preferences out unless a rule requires them.
4. Severity:
   - **High**: a bug, data loss, broken contract, or broken architecture.
   - **Med**: a maintainability, reuse or test gap.
   - **Low**: a nit.
5. Return the report in the `.agent/templates/REVIEW.md` format. The parent saves it as
   `.sdd/work/<id>/REVIEW.md`.
6. Result: **PASS** if there are no High or Med findings; otherwise FAIL.

## Output
`REVIEW.md`: a findings table (severity, file:line, problem, impact, fix) and a result line.

## Guardrails
- Read-only. The reviewer never edits code.
- No finding without a location and a reason. If every pattern is sound, say so instead of
  padding the report.
- Security issues found along the way are noted as `see security-auditor`, not deep-dived here.

## Stop conditions
The diff is empty or can't be resolved against the base. Report that and stop.
