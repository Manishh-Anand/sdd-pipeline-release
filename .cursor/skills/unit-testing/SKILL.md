---
name: unit-testing
description: Write unit tests for finished code, derived from the acceptance criteria and plan, in the project's existing test framework; run them and report. Use when the prompt carries the `--ut` flag, when asked to "write/add unit tests", or via the /unit-tests command. Runs as the test-writer subagent after implementation and before the review gate.
---
# Unit testing

## Purpose
Add unit tests that prove the finished behaviour. Tests come from what the code *should* do
(criteria, plan, contracts), not from echoing what it currently does, so they can catch bugs.

## Trigger
- The `--ut` flag in a feature, bug or quick-lane prompt: run after implementation, before the
  review gate.
- A direct request, or `/unit-tests [paths]`: run against the current diff or the named paths.

Run it as the `test-writer` subagent (the `test-writer` agent) for a fresh context.

## Inputs
- The diff (`git diff <base>`), or the named paths.
- `REQUIREMENTS.md` acceptance criteria and `PLAN.md`, if they exist; otherwise the request.
- `CODEBASE_CONTEXT.md` for the test command and framework; the `testing` rule.

## Process
1. **Find the framework and conventions.** Use the one the project already has (config, existing
   tests, CI). Copy the location, naming, fixture and mocking style of the nearest existing
   test. If the project has no test setup, stop (see Stop conditions).
2. **List the units under test**: each changed or new function, method, component or class
   with logic. Skip pure wiring, generated code, config and trivial getters.
3. **Derive cases** per unit, each tied to a criterion or a contract:
   - happy path;
   - boundaries (empty, null, zero, max, duplicates);
   - error paths and invalid input;
   - each branch the diff added;
   - for a bug fix, the regression case that fails without the fix.
4. **Write the tests** under the `testing` rule: one behaviour per test, behaviour-style names,
   no real network, clock or shared state, doubles only at the boundaries. Add to an existing
   test file when one exists for the unit.
5. **Run them** with the project's real command, scoped to the new tests first, then the full
   suite. Never invent a command.
6. **Triage failures.**
   - Test wrong: fix the test.
   - Code wrong: keep the failing test, do **not** touch source, and report it as a defect
     with file:line and expected vs actual.
7. **Mutation check** on risky logic: mentally or by a quick throwaway edit, confirm a test
   would fail if the branch were broken. Revert any throwaway edit.
8. Write `.agent/work/<id>/UNIT_TESTS.md` when a feature folder exists: units covered, cases
   per criterion, commands run with results, defects found, and units skipped with a reason.

## Output
New or changed test files, plus a summary (and `UNIT_TESTS.md` when a feature folder exists).

## Guardrails
- Edit **test files only**. Never change source, config, or existing tests' assertions.
- No snapshot-everything, no tests that only assert a mock was called, no `skip`/`only` left in.
- Do not add a test framework, dependency or config. Do not weaken a test to get green.
- A criterion with no testable unit is reported, not faked.

## Stop conditions
- No test framework or test command exists: report it, name the smallest setup needed, and
  ask before adding any.
- The new tests fail because of a source defect: finish the report, list the defect, and return
  to the parent. The review gate's "Validation failed" menu decides the fix.
