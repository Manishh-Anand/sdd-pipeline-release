---
name: validation
description: Independently prove a finished implementation works - run the project's real typecheck/lint/test/build commands, map every acceptance criterion to a passing test, and check the diff stays within the approved plan; write VALIDATION.md with evidence. Use after every implementation (both lanes) via the validator subagent, in parallel with code-reviewer and security-auditor.
---
# Validation

## Purpose
Prove that the change works with evidence. The implementer's opinion doesn't count. Code quality
belongs to `code-review`, and security to `security-auditor`.

## Trigger
After implementation, in both lanes. Run it as the `validator` subagent, so it gets a fresh context.

## Inputs
- `REQUIREMENTS.md` and `PLAN.md` (the quick lane may have neither; use the request instead).
- The diff (`git diff` against the base).
- The tooling commands recorded in `CODEBASE_CONTEXT.md`.

## Process
1. **Discover checks**, using the project's real commands only. Never invent a command.

   | Stack | Source of commands | Typical checks |
   |---|---|---|
   | Node/React/TS | `package.json` scripts | typecheck, lint, test, build |
   | .NET | `.sln`/`.csproj`, CI | `dotnet build` (warnings), `dotnet test` |
   | SQL | migrations, `.sql` | migration script generation; impact analysis present in plan |
   | Python | `pyproject`, CI | pytest; ruff/mypy only if configured |

   If a check isn't configured, record `NOT RUN: not configured`. In greenfield work, the
   scaffold step must have configured them.
2. **Run** each command and keep the exit code plus the relevant output lines as evidence.
3. **Check the diff**:
   - **Requirements**: every acceptance criterion maps to a test that ran and passed.
   - **Plan / scope**: no file or behaviour outside the approved plan. Any scope creep is a finding.
   - **Tests**: none deleted, skipped or weakened; no checks disabled to get green.
   - **Docs**: updated if behaviour or contracts changed.
   - **UI (optional)**: if Playwright MCP is available and a reference was transcribed, open the
     page and compare it against the `Reference` section of `REQUIREMENTS.md`.
4. Write `.agent/work/<id>/VALIDATION.md` from the template. Each row is PASS / FAIL /
   NOT RUN (reason).
5. Result:
   - **PASS** only if every required check passed.
   - Otherwise show the `Validation failed. N issues found.` menu from AGENTS.md §8.

## Output
`VALIDATION.md` and a one-screen summary.

## Guardrails
- Evidence before claims: no PASS without a command run or a specific line cited.
- The validator does not edit source. Fixes happen in the implementing context and are then
  re-validated.
- Never mark a skipped check as PASS.

## Stop conditions
The tooling can't run (missing SDK, no network for restore). Report it as NOT RUN with the error,
and don't claim success.
