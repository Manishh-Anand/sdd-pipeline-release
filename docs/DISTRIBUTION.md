# Distributing the pipeline to the team

Two channels. **Use the plugin** if your Cursor plan supports it; keep the Git installer
(§1 onward) as the fallback and for Claude Code users.

## 0. Cursor plugin (recommended)
`plugin/` is generated from the repo's sources by `node scripts/build-plugin.mjs` (CI fails if
it is stale). It ships the rules, skills, subagents, commands, MCP config and the router (as the
always-on rule `pipeline-router`). `.cursor-plugin/marketplace.json` makes the repo a marketplace.

**Publish (owners):**
1. Change sources, bump `VERSION`, run `node scripts/build-plugin.mjs`, open a PR (CI must pass),
   merge, tag `vX.Y.Z`.
2. *Team/private:* in the Cursor dashboard (Settings, Plugins), add this GitHub repo as a team
   marketplace and mark the plugin required or optional. Needs a plan with team marketplaces.
3. *Public:* submit the repo at cursor.com/marketplace/publish (Cursor reviews it).
4. *Local test before either:* copy `plugin/` to `~/.cursor/plugins/local/engineering-pipeline`
   and reload the window.

**Install (developers):** open Cursor's plugin marketplace, install `engineering-pipeline`, then
run `/pipeline-init` once in each project. That creates `.agent/memory`, `.agent/templates` and
`.agent/work`, which stay project-owned and are never updated by the plugin. Updates arrive with
the plugin version; no per-repo PR.

**Caveat:** `/pipeline-init` memory entries are per repo; fill `conventions.md` and `gotchas.md`.

## Git installer (fallback)

The model: **one template repo, owned by the platform/lead team, installed into each project
repo through a PR.** Developers install nothing. Cursor picks the pipeline up from the project
repo when they open it.

```
 sdd-pipeline-release (template repo, tagged releases)
        │  node scripts/install.mjs <repo>            first time
        │  node scripts/install.mjs <repo> --update   new release
        ▼
 project repos (each via PR) ──► developers pull ──► Cursor loads AGENTS.md, rules, skills, agents
```

1. Host this repo as `sdd-pipeline-release` (GitHub or Azure DevOps).
2. Protect `main`: PRs only, with one approval from the pipeline owners. Add a `CODEOWNERS`
   file, e.g. `* @your-org/eng-leads`.
3. Add CI that runs on every PR (§5).
4. Tag releases: `git tag vX.Y.Z`. The `VERSION` file holds the current number, and every
   install records it in the target's `.agent/pipeline-lock.json`.

## 2. Roll out to a project (per repo)
```powershell
git clone --depth 1 --branch vX.Y.Z https://<host>/<org>/sdd-pipeline-release C:\tools\sdd-pipeline-release
cd C:\path\to\project; git checkout -b chore/engineering-pipeline
node C:\tools\sdd-pipeline-release\scripts\install.mjs . --dry-run   # preview
node C:\tools\sdd-pipeline-release\scripts\install.mjs .
```
- **Conflicts** (exit code 2) are files the project already had, e.g. its own `AGENTS.md`. Merge
  the pipeline sections into them by hand.
- **Fill in project memory**: add 3–10 conventions to `.agent/memory/conventions.md` that aren't
  obvious from the code, and known traps to `gotchas.md`. This is the main per-project setup
  work.
- **Run** `node .agent/scripts/check-pipeline.mjs`, add it to the project's CI (§5), and open the PR.

Roll out to one pilot repo and 2–3 developers for a week first, then to the rest.

## 3. Ship an update
1. **Change the template.** Make the change in `sdd-pipeline-release` through a PR (CI must pass),
   bump `VERSION`, and tag the release.
2. **Update each project:**
   ```powershell
   git -C C:\tools\sdd-pipeline-release fetch --tags; git -C C:\tools\sdd-pipeline-release checkout vX.Y.Z
   node C:\tools\sdd-pipeline-release\scripts\install.mjs C:\path\to\project --update
   ```
   - Files **unchanged since the last install** are replaced. Files the pipeline dropped are
     deleted.
   - Files the **project edited** are left alone and listed as conflicts.
   - `.agent/memory/` is never touched.
3. **Open a PR per project.** The diff shows exactly what changed.

**Customising per project:** prefer adding a new rule (`.cursor/rules/project-*.mdc`) or memory
entries over editing pipeline files. Edited pipeline files stop receiving updates until someone
merges them by hand.

## 4. Onboard developers (about 15 minutes)
- **Requirements:** Cursor 2.4 or later and a vision-capable model. Nothing to install.
- **Demo:** show `docs/TESTING.md` scenario A live: the intake, the answer shorthand,
  the Build click, and the review gate.
- **Cheat sheet:**

  | I want to… | Mode | Say |
  |---|---|---|
  | build a feature | Plan | describe it, then answer the 7 items as `1. ok 2. 1 …` and click Build |
  | fix a bug | Debug | the symptom |
  | understand code | Ask | the question |
  | make a tiny change | Agent | the change |
  | give a screenshot | any | Ctrl+V or drag it into chat; if that fails, `@path/to/file.png` |
  | get terse answers | any | `/caveman` |

## 5. CI check
The check catches broken or bloated pipeline files and unregistered skills. It needs Node 20 or
later and no install.

GitHub Actions (`.github/workflows/pipeline-check.yml`):
```yaml
name: pipeline-check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node .agent/scripts/check-pipeline.mjs
```
Azure Pipelines:
```yaml
- task: NodeTool@0
  inputs: { versionSpec: '22.x' }
- script: node .agent/scripts/check-pipeline.mjs
  displayName: Pipeline check
```
In the template repo itself, also run `node --test scripts/pipeline.test.mjs`.

## 6. Later: an org-wide layer
Once the rules and skills stop changing every week, package the project-agnostic parts (rules,
pipeline skills, review subagents) as a Cursor team plugin or as team rules, so they no longer
need copying. Project memory, conventions and project-specific rules stay in each repo. Check
Cursor's current team and plugin features when you get there; this guide doesn't depend on them.

## 7. Feedback loop
- **Developers** report problems as issues on `sdd-pipeline-release`, with the chat transcript or
  the `.agent/work/<id>/` files attached.
- **Owners** review them monthly: tighten a skill, adjust a rule glob, or add a gotcha to memory.
  They ship the fix as a release.
- **Quality signal:** the share of PRs whose final report shows all three review gates passing.
