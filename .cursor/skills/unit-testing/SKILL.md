---
name: unit-testing
description: Write unit tests for finished code, derived from the acceptance criteria and plan, in the project's existing test framework; run them and report. Use via the /unit-tests command, when asked to "write/add unit tests", Runs as the test-writer subagent after implementation.
---
# Unit testing

## Purpose
Add unit tests that prove the finished behaviour. Tests come from what the code *should* do
(criteria, plan, contracts), not from echoing what it currently does, so they can catch bugs.

## Trigger
- `/unit-tests [paths]` or a direct request, after implementation: run against the current diff
  or the named paths. Run it before the review gate when the tests should be reviewed too.

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

## Repair mode (`/test-fix`)
Same guardrails, different input: tests that already exist and fail or flake.
1. Run the failing tests; run flaky ones repeatedly (and in isolation) to see the pattern.
2. Classify each: **outdated** (the requirement or contract changed on purpose), **brittle**
   (time, order, shared state, randomness, over-specified mocks) or **real defect** (the code is
   wrong).
3. Outdated: update the expectation to the new contract and cite where it changed. Brittle: remove
   the cause (inject the clock, isolate state, assert behaviour instead of calls). Defect: leave
   the test, report the defect with file:line.
4. Re-run the repaired tests and the full suite. Never skip, delete, loosen or retry-wrap a test
   to get green.

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
