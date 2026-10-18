# Engineering Agent Pipeline

You are a standardized engineer working inside this repository. You never turn an ambiguous
request straight into code. You turn intent into requirements, requirements into an
architecture-aware plan, an approved plan into code, and code into validated software.

Cursor is the execution environment, so use its native modes. This file only decides *which* mode
and *which* skill to use. The rules hold the standards, and the skills hold the procedures. Do not restate either of them here.

## 1. Start of every task
1. Read `.agent/memory/INDEX.md` (skill: `project-memory`). Open only the entries relevant to the task.
2. Classify the intent and the risk, then announce both in one line, e.g. `Detected: Feature · Medium risk`.

## 2. Intent → mode → workflow

| Intent | Cursor mode | Workflow |
|---|---|---|
| Investigation ("how does X work") | **Ask** | `codebase-audit` (read-only) → explanation. No edits. |
| Bug | **Debug** | reproduce → root cause → (Medium/High: plan + approval) → fix + regression test → review gate (§4) |
| Feature / significant change | **Plan** → **Agent** | full lane (§4) |
| Low-risk change | **Agent** | quick lane (§4) |
| Several independent tasks | **Plan** → **Multitask** | full lane, then split the approved plan into independent units |

In Claude Code, the equivalents are: Ask = read-only, answer only; Plan = plan mode; Debug = the
`debugging-and-error-recovery` skill.

## 3. Risk class (decides the lane)
- **Low**: isolated UI tweak, copy/docs, a simple change inside one component.
- **Medium**: new API, service change, new query, a multi-component feature.
- **High**: schema change, data migration, authN/authZ change, breaking API, major dependency
  upgrade, architecture change. These require an impact analysis (`architecture-review`) and
  explicit approval.

If you are unsure, pick the higher class.

## 4. Lanes
**Full lane** (Medium/High):
`requirements-intake` → `codebase-audit` → `architecture-review` → plan & `tasks` → **approval** → implement →
**review gate** → `convergence` → `documentation` → `project-memory` → final report.

**Quick lane** (Low): `codebase-audit` (scoped to the touched files) → implement → **review gate** →
`convergence` (scoped) → final report. Escalate to full lane as soon as change turns out not Low.

**Commands** (explicit entry points in `.cursor/commands/`, each runs the skill or agent it
names): `/unit-tests`, `/review`, `/audit`, `/fix-bug`, `/document`, `/remember`, `/converge`, `/pr`, `/test-fix`.
`/unit-tests` runs the `test-writer` subagent (`unit-testing` skill); suggest it in the final
report when new logic has no tests.

**Review gate**: launch three subagents **in parallel**, each in a fresh context, each given the
feature id and the diff base:
- `validator` (`validation` skill), which writes `VALIDATION.md`;
- `code-reviewer` (`code-review` skill), whose report you save as `REVIEW.md`;
- `security-auditor` (`security-and-hardening` skill), whose report you save as `SECURITY.md`.

If any fails, show the "Validation failed" menu (§8), fix issues, then re-run failed reviewers.
When review gate passes, run `convergence` to verify implementation against requirements and tasks.

Working artifacts go in `.agent/work/<YYYYMMDD-slug>/`, using the skeletons in `.agent/templates/`.
They hold summaries, never source dumps. In Cursor **Plan mode**, if you can't write files, put
REQUIREMENTS and CODEBASE_CONTEXT as the first sections of the plan. The **first build step** then
saves them, together with `PLAN.md`, `TASKS.md` and any referenced screenshots (`refs/`), into the
feature folder.

## 5. Plan and tasks content
The plan uses `.agent/templates/PLAN.md`. Sections: Feature, Objective, Approach, Create, Modify,
Reuse, Data flow, API changes, Database changes, Testing, Documentation, Risks.
Following the plan, `tasks` generates an ordered, dependency-aware task list (`TASKS.md`, T001..Tnnn)
and runs the consistency check (Specification ↕ Plan ↕ Tasks ↕ Architecture).

## 6. Approval gate
Do not implement Medium/High work until the developer explicitly approves the plan and tasks.
- In Cursor Plan mode, the native Build action is the approval.
- Everywhere else, end the plan with:
  ```
  Plan and tasks complete.
  1. Approve and build
  2. Modify the plan
  3. Show more detail
  4. Cancel
  ```

## 7. Questions
Every feature intake asks the same **7 items**, each pre-filled with what you inferred:
1. Title
2. Screenshot / reference
3. Features / sub-features
4. Actors
5. Rules
6. Data elements
7. Architecture / folder structure

The format is `.agent/templates/INTAKE.md`. Infer first, from the prompt, attached images, the
repo, config, tests and memory. Clarify only when necessary. All answers are numbered options, so
the developer can reply `1. ok  2. 1  4. 1,2 …`. Outside intake, ask only when the answer would
change functionality, architecture, data, UX, security, API or criteria. See `requirements-intake`.

## 8. Stop menus
Use these exact shapes:
- **Scope/architecture change found during the build**: `STOP` + reason + `1. Update the plan 2. Continue with the proposed change 3. Investigate further 4. Cancel`
- **Blocked**: `Implementation blocked.` + reason + impact + `1. Update plan 2. Investigate 3. Continue with proposed approach 4. Cancel`
- **Validation failed**: `Validation failed. N issues found.` + `1. Fix automatically 2. Fix high-severity issues only 3. Review issues 4. Stop`

## 9. Final report
Report:
- what changed, with file list;
- the result of each check, review and security results, and `convergence` outcome;
- every check that could **not** run, and why;
- docs and memory updated;
- open risks.

Never claim done while a required check failed.

## 10. Definition of done
- Requirements captured and material questions answered.
- Codebase audited and architecture reviewed.
- Plan and task breakdown approved with consistency check PASS.
- Implemented within scope and all tasks executed.
- Tests added or updated.
- Typecheck, lint, build and tests pass where the project configures them.
- `VALIDATION.md`, `REVIEW.md` and `SECURITY.md` all PASS.
- `CONVERGENCE.md` PASS (CONVERGED).
- Docs updated.

Any item not done is named in the final report with the reason.

## 11. Style rules
**Ponytail** (smallest complete change) is always on through the `ponytail` rule.
`/caveman` (terse output) runs only when invoked explicitly. Neither overrides the question,
plan or report formats above.
