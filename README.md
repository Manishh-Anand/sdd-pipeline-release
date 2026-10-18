# Engineering Agent Pipeline

A Git-distributed workflow that makes AI coding agents in Cursor (and Claude Code) behave like a
standardised engineer:

intent → requirements → audit → plan → **approval** → build → **independent validation** → docs → memory.

| Path | What it is |
|---|---|
| `AGENTS.md` | Router: intent → Cursor mode → skills, risk lanes, gates |
| `.cursor/rules/` | Coding standards (3 always on, 11 attached by file type) |
| `.cursor/skills/` | 10 pipeline skills + 6 vetted external skills ([register](docs/EXTERNAL_SKILLS.md)) |
| `.claude/agents/` | Review gate subagents: `validator`, `code-reviewer`, `security-auditor` (run in parallel), `test-writer` (via `/unit-tests`) |
| `.cursor/commands/` | `/unit-tests` `/review` `/audit` `/fix-bug` `/document` `/remember` `/converge` `/pr` `/test-fix` |
| `plugin/` | Generated Cursor plugin; `.cursor-plugin/marketplace.json` makes this repo installable from a marketplace ([docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)) |
| `.agent/memory/` | Team memory (decisions, conventions, gotchas), reviewed in PRs |
| `.agent/templates/` | Skeletons for the REQUIREMENTS / CODEBASE_CONTEXT / PLAN / VALIDATION artifacts |
| `docs/` | Rollout guide, skill register, testing guide, PRD (historical; `AGENTS.md` is current) |

## Use
- **Try it in Cursor:** [docs/TESTING.md](docs/TESTING.md)
- **Roll out to the team:** [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)
- **Unit tests:** run `/unit-tests [paths]` after a build. Other entry points are listed in `.cursor/commands/`.
- **Build the plugin after editing sources:** `node scripts/build-plugin.mjs`
- **Install / update a project (commit the pipeline):** `node scripts/install.mjs <repo> [--update] [--dry-run]`. It never overwrites
  existing files.
- **Local bootstrap (no plugin/admin access):** from an existing project root run `npx --yes --prefer-online --package=github:Manishh-Anand/sdd-pipeline-release#dist/sdd-pipeline sdd-pipeline-bootstrap .`. Add `--dry-run` to preview or `--update` to refresh. It copies only the Cursor runtime and uses the project's `.git/info/exclude` so pipeline files are not staged by default.
- **Check after editing the pipeline:** `node .agent/scripts/check-pipeline.mjs && node --test scripts/pipeline.test.mjs`

## License
Pipeline files are internal to your organisation. Vendored skills keep their own MIT licenses (see `docs/licenses/` and each skill's `LICENSE`).
