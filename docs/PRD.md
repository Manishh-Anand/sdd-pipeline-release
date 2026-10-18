# Engineering Agent Pipeline: Product Requirements Document
Version: 2.1 baseline, extended by SDD in 2.3.0 (`tasks` and `convergence` skills, approval gate) · Target: Cursor (primary) + Claude Code

## 1. Summary
A reusable, repository-native AI engineering workflow. It stops the "prompt → code
immediately" habit and enforces this lifecycle:

```
Request → intent + risk → Cursor mode → requirements → codebase audit → architecture review
        → plan → human approval → build → independent validation → docs → memory → report
```

Cursor's native capabilities do the work: Ask, Plan, Agent, Debug, Multitask, Rules, Skills,
Subagents and MCP. The pipeline adds the method around them: standards, gates, artifacts and
consistency. It doesn't re-implement any of them.

## 2. Problem
Two developers who send the same prompt ("Add an application risk dashboard") get structurally
different results:
- one reuses components and adds tests;
- the other duplicates components, adds dependencies, invents business rules and skips
  validation.

Both "work". The missing piece is a **standard engineering process**, not better code
generation.

## 3. Goals
- One standard workflow across developers, without forcing every project into one architecture.
- Plan before build, with human approval for any significant work.
- Infer before asking. Ask only high-impact questions, as numbered multiple choice.
- Inspect the codebase and reuse what exists. Existing architecture wins over generic best
  practice.
- Modular, technology-specific coding standards that load only when relevant.
- Independent validation using the project's real tooling.
- Docs updated when behaviour changes.
- **Durable team memory across sessions** (new in 2.1).
- Small context footprint. Distributed through Git. Extensible to new stacks.

## 4. Non-goals
- Replacing human ownership of architecture.
- One giant skill, or a single always-loaded rule set.
- Duplicating Cursor's native Plan, Ask, Debug, Agent or permission controls.
- Blindly installing third-party skills.
- Autonomous architecture changes, or rewriting unrelated code.
- Bureaucracy for trivial changes. The quick lane exists for these.

## 5. Design principles
1. **Native first.** Planning goes to Plan mode, read-only work to Ask, bugs to Debug,
   building to Agent, parallel work to Multitask, standards to Rules, procedures to Skills,
   independent checks to Subagents, and external tools to MCP.
2. **Plan before build.** Medium/High work isn't implemented until requirements are understood,
   the code has been audited, a plan exists and the developer has approved it.
3. **Infer before asking.** Use the prompt, screenshots, repo, config, tests, docs and memory first.
4. **Ask only what matters.** A question must be able to change functionality, architecture,
   data, UX, security, the API, the schema or acceptance criteria.
5. **Multiple choice.** Questions are numbered, with options and a recommended default. Answers
   look like `1. 2  2. 4 — use existing API`.
6. **Reuse before create.**
7. **Existing architecture wins.** Conflicts are flagged, never resolved silently.
8. **Small context.** Skills are short and single-purpose, and rules are scoped by file globs.
9. **Validation is separate.** It runs in a fresh-context subagent, never as the implementer
   grading itself.
10. **Memory is reviewed.** Durable knowledge lives in Git and changes through PRs.

## 6. Supported stacks
- **Backend:** C#, .NET, ASP.NET Core (controllers and minimal APIs), EF Core.
- **Database:** SQL Server: T-SQL, procs, views, migrations.
- **Frontend:** React, TypeScript/JavaScript (JSX/TSX), Vite.
- **Python:** apps, APIs, automation, AI/ML services.

To add a stack, add one glob-scoped rule. The workflow doesn't change.

## 7. Architecture (as built)

| Concern | Mechanism | Location |
|---|---|---|
| Routing (intent → mode → skill, risk lanes, gates, stop menus) | `AGENTS.md`, read natively by Cursor | `AGENTS.md` |
| Claude Code compatibility | `CLAUDE.md` imports `@AGENTS.md` and says where rules and skills live | `CLAUDE.md` |
| Always-on standards | 3 rules with `alwaysApply` | `.cursor/rules/engineering-core.mdc`, `security.mdc`, `ponytail.mdc` |
| Technology standards | 11 rules, auto-attached by `globs` | `.cursor/rules/*.mdc` |
| Procedures | 9 internal skills (≤150 lines, fixed section layout) | `.cursor/skills/<name>/SKILL.md` |
| Specialist knowledge | 6 vendored external skills (pinned, reviewed) | `.cursor/skills/`, `docs/EXTERNAL_SKILLS.md` |
| Review gate (2.1) | 3 fresh-context subagents in parallel: validator, code-reviewer, security-auditor | `.claude/agents/` (Cursor and Claude Code both read it) |
| Working state between phases | Per-feature artifacts, gitignored | `.sdd/work/<YYYYMMDD-slug>/` |
| Artifact skeletons | Templates | `.agent/templates/` |
| Team memory | Index plus one-fact files and ADRs, in Git | `.agent/memory/` |
| Grounding and runtime checks | MCP: Context7 (docs), Playwright (UI) | `.cursor/mcp.json`, `.mcp.json` |
| Quality gates | Linter plus self-tests | `.agent/scripts/check-pipeline.mjs`, `scripts/pipeline.test.mjs` |
| Distribution | Installer that never overwrites | `scripts/install.mjs` |

## 8. Intent routing

| Intent | Cursor mode | Workflow |
|---|---|---|
| Investigation | Ask | audit (read-only) → explanation, with no edits |
| Bug | Debug | reproduce → root cause → (Medium/High: plan + approval) → fix → validate |
| Feature / significant change | Plan → Agent | full lane |
| Low-risk change | Agent | quick lane |
| Independent parallel tasks | Plan → Multitask | full lane, then split the approved plan |

## 9. Risk classes and lanes
- **Low:** isolated UI tweak, docs, a simple change inside one component. Goes to the **quick
  lane**: scoped audit → build → validation.
- **Medium:** new API, service change, new query, multi-component feature. Goes to the **full
  lane**.
- **High:** schema change, data migration, authN/authZ, breaking API, major dependency upgrade,
  architecture change. Goes to the **full lane plus an impact analysis** and explicit approval.

When unsure, pick the higher class. Escalate as soon as a Low change turns out to be bigger.

## 10. Skills

| Skill | Output | Key rule |
|---|---|---|
| requirements-intake | `REQUIREMENTS.md` | The same **7-item intake** every time (Title, Screenshot, Features/Sub-features, Actors, Rules, Data elements, Architecture/folder structure), each pre-filled with tagged inferences and answered by numbered options (`.agent/templates/INTAKE.md`). Screenshots pasted in chat are transcribed into the requirements; `@file` screenshots are copied to `refs/`. At most 2 rounds |
| codebase-audit | `CODEBASE_CONTEXT.md` (≤80 lines) | Detects GREENFIELD (no app code), or derives the stack from manifests, a trace of the closest existing feature, patterns, reuse candidates, the **real tooling commands** |
| architecture-review | sections in `PLAN.md` | Reuse / Modify / Create / Avoid; layer and dependency direction; risk class; impact analysis for High |
| validation (validator subagent) | `VALIDATION.md` | Real commands only; acceptance-criteria→test mapping; scope check; evidence before claims; NOT RUN with a reason |
| code-review (code-reviewer subagent) | `REVIEW.md` | Correctness, architecture fit, reuse, standards, test quality; read-only; PASS = no High/Med findings |
| security audit (security-auditor subagent + `security-and-hardening`) | `SECURITY.md` | Trust boundaries, injection, authZ, secrets, dependency audit; read-only |
| documentation | `docs/features/<slug>.md` | Only when behaviour, contracts, setup or architecture changed; update, don't duplicate |
| project-memory | `.agent/memory/*` | Reads the index first; writes 0–3 one-fact entries after validation; reviewed through PRs |

v2.0 had an `implementation-standards` skill. It was **removed** because it would have duplicated
the rules. Implementation = Agent mode + the approved `PLAN.md` + glob-scoped rules. Scope
protection lives in `engineering-core`.

## 11. Plan content and approval
The plan template's sections are: Objective, Approach, Reuse/Modify/Create/Avoid, Steps (each
naming its files and how it's verified), Data flow, API changes, Database changes (with impact
analysis for High), Testing, Documentation, Risks.

**Approval:**
- In Cursor Plan mode, the native Build action is the approval.
- Everywhere else, the plan ends with `1. Approve and build  2. Modify the plan  3. Show more detail  4. Cancel`.
- Nothing Medium/High is implemented without explicit approval.

## 12. Stop menus
- **Scope change:** `STOP` + reason + `1. Update the plan 2. Continue with the proposed change 3. Investigate further 4. Cancel`
- **Blocked:** `Implementation blocked.` + reason + impact + `1. Update plan 2. Investigate 3. Continue 4. Cancel`
- **Validation failed:** `Validation failed. N issues found.` + `1. Fix automatically 2. Fix high-severity only 3. Review issues 4. Stop`

## 13. Coding standards
- Rule precedence: company > team rules > project architecture > existing patterns > feature
  request. Conflicts are flagged.
- Every technology rule starts from "follow the existing project convention".
- Database schema changes always need an impact analysis.
- The topic coverage per stack follows v2.0 §24–32.
- The security baseline is always on. Deeper review goes to `security-and-hardening`.

## 14. Validation
Checks: requirements (each acceptance criterion maps to a test), plan/scope, architecture,
standards, tests, type check, lint, build, security, docs.

Commands are discovered from `package.json` scripts, `.sln`/`.csproj`, `pyproject` or CI, and
never invented. Each finding records severity, file, location, problem, impact and fix. A
skipped check is never reported as PASS.

## 15. Memory (new in 2.1)
Cursor removed its native Memories feature in 2.1 (Nov 2025). The pipeline's memory is:
- `.agent/memory/INDEX.md` (≤100 lines): one line per entry, read at the start of every task;
- `decisions/NNNN-slug.md`: lightweight ADRs with a status (accepted / superseded);
- `conventions.md` and `gotchas.md`: one bullet each, with a **Why:** line.

Only non-obvious facts that will matter again go in: no code facts, task progress or secrets.
Entries are proposed at the end of a task and reviewed in the PR. Entries that turn out wrong
are deleted.

Automatic capture tools (e.g. claude-mem) are allowed as **personal** add-ons, not as team memory.

## 16. Context management
- Always loaded: the `AGENTS.md` router and two short rules.
- Loaded by file glob: the technology rules.
- Loaded by name and description until used: the skills.
- Loaded on demand: skill references.
- Artifacts hold summaries and paths, never source dumps.
- Size caps are enforced by `check-pipeline.mjs`: router ≤150 lines, rule ≤80, core ≤60,
  internal skill ≤150, vendored skill ≤350.
- 3+ identical lines shared across internal files fail the check.

## 17. External skills
To be admitted, a skill must add measurable value, not duplicate an internal skill, not conflict
with the rules, and be scoped (`paths`) or opt-in (`disable-model-invocation`).

The admission process:
1. Pin a commit.
2. Read every file.
3. Remove live remote fetches.
4. Keep the license.
5. Register the skill in `docs/EXTERNAL_SKILLS.md`.

Vendored (MIT):
- vercel-composition-patterns
- web-design-guidelines (rules pinned locally)
- optimizing-ef-core-queries (dotnet/skills)
- security-and-hardening and debugging-and-error-recovery (addyosmani)
- caveman and ponytail (opt-in)

The rejections, with reasons, are recorded in the register.

## 18. Security
- No secrets in code, tests, docs or commits.
- Validate at trust boundaries.
- Parameterised SQL only.
- Explicit authorization on every endpoint.
- Minimal error detail returned to clients.
- Never disable security controls or tests to get green.
- Never bypass Cursor/Claude permission controls.
- Auth, crypto and secrets changes are High risk.

## 19. Distribution
1. **Repository-native** (now): `node scripts/install.mjs <repo>` copies the pipeline without
   overwriting anything, reports conflicts and updates `.gitignore`. Then commit.
2. **Team plugin** (later): package the stable, project-agnostic layer (rules, skills, validator)
   as a Cursor plugin. Project architecture, memory and conventions stay in each repo.
3. **Org-level rules** (optional): centralised company rules on top.

## 20. Definition of done
Every item below is done, or named in the final report with the reason it isn't:
- requirements captured and material questions answered;
- code audited and architecture reviewed;
- plan approved;
- implemented within scope;
- tests added;
- typecheck, lint, build and tests passing where configured;
- security checked;
- docs updated;
- `VALIDATION.md` written;
- memory proposals listed.

## 21. Acceptance tests
Tooling (automated, passing):
- `node .agent/scripts/check-pipeline.mjs`
- `node --test scripts/pipeline.test.mjs` (8 tests, including negative fixtures and the
  installer's no-overwrite behaviour)

Sample apps and workflow scenarios A–E live in the separate `engineering-pipeline-samples` repo; see `docs/TESTING.md`.

## 22. Product principle
AI must not turn an ambiguous request directly into code. It turns intent into requirements,
requirements into an architecture-aware plan, an approved plan into code, and code into
validated software. Cursor is the execution environment. The pipeline is the engineering
discipline around it.
