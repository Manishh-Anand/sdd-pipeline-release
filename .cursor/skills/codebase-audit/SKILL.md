---
name: codebase-audit
description: Inspect the repository before planning or explaining - detect the real stack from manifests, map architecture layers and patterns, and find reusable components/services/APIs relevant to the task. Use before any implementation plan, for read-only "how does X work" investigations, and (scoped) in the quick lane.
---
# Codebase audit

## Purpose
Ground every plan and explanation in what the repository actually contains.

## Trigger
- Full lane, after `requirements-intake`.
- Quick lane, scoped to the files being touched.
- Every Ask-mode investigation.

## Inputs
`REQUIREMENTS.md` (if any), the repository, and `.agent/memory/` (conventions and gotchas).

## Process
0. **Greenfield check**: if the repo has no application code (only pipeline files and dotfiles: `.cursor/`,
   `.claude/`, `.agent/`, `docs/`, `scripts/`, `AGENTS.md`, `CLAUDE.md`, `README.md`), report `GREENFIELD`. Record the
   installed toolchains (`node --version`, `dotnet --version`, `python --version`) and skip
   steps 2–5. `architecture-review` then proposes a layout.
1. **Stack**: detect it from the manifests, not from the prompt.
   - `package.json` (React, Vite and test runner versions, scripts)
   - `*.sln`/`*.csproj` (TargetFramework, packages: EF Core provider, test framework)
   - `pyproject.toml`/`requirements*.txt`
   - `*.sql`/`*.sqlproj`/`Migrations/`
2. **Boundaries**: find the apps and projects, how they depend on each other, and where the
   tests live.
3. **Architecture**: trace one existing feature similar to the request, end to end (e.g. UI route
   → component → hook/API client → endpoint → service → data access → table). That trace is the
   pattern to follow.
4. **Patterns**: note how this repo handles each of these, with one example file each:
   - API calls;
   - errors;
   - logging;
   - auth;
   - validation;
   - data access;
   - state;
   - tests.
5. **Reuse**: search by name *and* by behaviour for existing components, hooks, services, DTOs,
   endpoints and queries the task can use. Prefer Cursor's semantic search, then grep.
6. **Tooling**: record the real commands for typecheck, lint, test and build (from package
   scripts, the .sln, pyproject or CI files). `validation` uses exactly these.
7. For the full lane, write `.agent/work/<id>/CODEBASE_CONTEXT.md` from the template. In Ask mode,
   answer directly and don't write files.

## Output
`CODEBASE_CONTEXT.md` (≤ 80 lines), or an Ask-mode explanation with file references
(`path:line`).

## Guardrails
- Summaries and file paths only. Never paste whole source files into the artifact.
- Include only what is relevant to this task, not a whole-repo inventory.
- Read-only. This skill never edits code.
- When unsure, mark a finding `uncertain` instead of presenting a guess as fact.

## Stop conditions
- The stack or architecture contradicts the requirements (e.g. the request assumes an API that
  doesn't exist). Report it and return to intake.
