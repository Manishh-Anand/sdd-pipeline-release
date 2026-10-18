# External skills register

The internal pipeline (`AGENTS.md`, `.cursor/rules`, the ten internal skills) is authoritative.
An external skill is admitted only if it adds measurable value, doesn't duplicate an internal
skill, and doesn't conflict with the rules.

## Admission process
Every new skill or update goes through a PR:
1. Clone the source at a fixed commit into an isolated directory.
2. Read **every** file. Skills can instruct the agent to run code or fetch remote content.
3. Remove or rewrite anything that fetches live instructions, references files that weren't
   vendored, or conflicts with `engineering-core`.
4. Copy the skill into `.cursor/skills/<name>/`, keeping its `LICENSE`, and add the provenance
   comment under the frontmatter.
5. Add `paths` (the file scope) or `disable-model-invocation: true` (opt-in only) so the skill
   doesn't load into unrelated work.
6. Add a row below and run `node .agent/scripts/check-pipeline.mjs`.

## Vendored

| Skill | Source @ commit | License | Invocation | Why | Local edits |
|---|---|---|---|---|---|
| vercel-composition-patterns | vercel-labs/agent-skills @ 063bee9 | MIT | model, `**/*.tsx,*.jsx` | Prevents boolean-prop sprawl and duplicate components. Fills in the reuse/composition guidance in `react.mdc` | Dropped the pointer to the 946-line compiled AGENTS.md; added `paths` |
| web-design-guidelines | vercel-labs/agent-skills @ 063bee9 + vercel-labs/web-interface-guidelines @ 434b7f9 | MIT | model, UI files | 100+ checkable a11y/UX rules for validating UI changes | **Upstream fetched rules from a live URL on every run.** Rules are now pinned in `references/guidelines.md` |
| optimizing-ef-core-queries | dotnet/skills @ 10d85e2 | MIT | model, `**/*.cs` | Microsoft's own EF Core review: N+1, tracking, paging, indexes. Deeper than `ef-core.mdc` | Added `paths` |
| security-and-hardening | addyosmani/agent-skills @ aeac41d | MIT | model (by description) | OWASP/STRIDE threat-model workflow plus checklists. `security.mdc` defers to it | Repo-level `security-checklist.md` moved into `references/` |
| debugging-and-error-recovery | addyosmani/agent-skills @ aeac41d | MIT | model (by description) | Reproduce → localize → reduce → fix → guard. This is the Debug-mode procedure | Removed "Safe Fallback Patterns" (silent defaults violate `engineering-core`); fixed a cross-skill reference |
| caveman | JuliusBrussee/caveman @ 81958ad | MIT | **opt-in** `/caveman` | Terse output (fewer tokens). It keeps full sentences for questions and options, so the pipeline's formats survive | Removed the ultra/wenyan/status aliases (those skills weren't vendored) |

## Vendored as a rule

| Rule | Source @ commit | License | Invocation | Why | Local edits |
|---|---|---|---|---|---|
| ponytail | DietrichGebert/ponytail @ 84740e3 (v5.2.0) | MIT (`docs/licenses/ponytail-LICENSE`) | **always on** (`.cursor/rules/ponytail.mdc`) | Smallest complete diff, reuse first, never cut validation or security. Team decision (2026-10-17) | Converted from skill to an `alwaysApply` rule; removed the session toggle and the lite/ultra levels; "never cut" also covers the approved plan and the pipeline gates |

## Evaluated, not vendored

| Candidate | Decision | Reason |
|---|---|---|
| vercel-labs `react-best-practices` | rejected | Next.js/RSC-focused. Most rules don't apply to Vite SPAs |
| dotnet/skills `run-tests` | rejected | 311 lines and depends on the `platform-detection`/`filter-syntax` skills. `validation` already runs `dotnet test`. Reconsider for repos on MTP/TUnit |
| obra/superpowers `systematic-debugging` | rejected | Overlaps more than half of `debugging-and-error-recovery`, which was kept because it also treats error output as untrusted |
| obra/superpowers `verification-before-completion` | absorbed | Its "evidence before claims" gate is built into `validation` and `engineering-core` → Honesty |
| obra/superpowers `writing-plans` | absorbed | File-level steps, each with a verification, are built into `.agent/templates/PLAN.md` |
| addyosmani `documentation-and-adrs` | absorbed | The ADR format is in `.agent/templates/ADR.md` |
| claude-mem | rejected for the team | Automatic capture into SQLite/Chroma through the Claude API: per-machine, not reviewable in Git, and heavy. Fine as a personal add-on |
| Cursor native Memories | n/a | Removed by Cursor in 2.1. Replaced by `.agent/memory` + `project-memory` |

## MCP servers (`.cursor/mcp.json`, `.mcp.json`)

| Server | Pinned | Why |
|---|---|---|
| context7 | `@upstash/context7-mcp@4.1.1` | Version-correct library docs, so the agent doesn't invent APIs |
| playwright | `@playwright/mcp@0.0.83` | Lets validation check React UI behaviour in a real browser |

Optional per-developer servers (not committed): GitHub MCP (PRs and issues), Sentry MCP
(production errors).
