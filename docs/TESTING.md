# Testing the pipeline in Cursor

Use this before a release, or after changing rules, skills or `AGENTS.md`.

## 1. Automated checks
```powershell
node .agent/scripts/check-pipeline.mjs
node --test scripts/pipeline.test.mjs
```
Both must pass (`Pipeline check PASSED`, all tests green).

## 2. Check what Cursor loaded
Open the repo in Cursor (2.4 or later, vision-capable model), then **Cursor Settings → Rules / Skills / Subagents / MCP**:

| Capability | Expected |
|---|---|
| Rules | 14 `.mdc` rules. `engineering-core`, `security` and `ponytail` always apply; the other 11 attach by glob. |
| Skills | 9 internal skills + 6 vendored ([register](EXTERNAL_SKILLS.md)) |
| Subagents | `validator`, `code-reviewer`, `security-auditor` |
| MCP | `context7`, `playwright` |

If something is missing, run **Developer: Reload Window**.

## 3. Workflow scenarios
Run these against the sample apps in
[engineering-pipeline-samples](https://github.com/Manishh-Anand/engineering-pipeline-samples)
(install the pipeline into a clone first: `node scripts/install.mjs <clone>`).

| # | Mode | Prompt | Expected |
|---|---|---|---|
| A | Plan → Agent | "Add filtering to the application dashboard." | `Detected: Feature · Medium risk`; 7-item intake pre-filled; reuses `FilterBar`; `PLAN.md` + `TASKS.md` + consistency check; approval gate; review gate (3 subagents in parallel); `CONVERGENCE.md` = CONVERGED |
| B | Plan → Agent | "Add an endpoint to retrieve application risk information." | aspnet-core / ef-core rules load; reuses `ApplicationService` and the DTO pattern |
| C | Plan | "Add a column to store application criticality." | High risk; impact analysis (migration, backfill); explicit approval |
| D | Debug | "The application filter is not updating the table." | Skips intake; root cause in `Dashboard.tsx` (planted bug); regression test; review gate |
| E | Ask | "How does authentication work in this application?" | Read-only; explains `ApiKeyAuthenticationHandler` with `file:line`; `git status` clean |

Record the date, Cursor version and result of each run in the PR that ships the release.
