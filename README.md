# Engineering Agent Pipeline

A Git-distributed workflow that makes AI coding agents in Cursor (and Claude Code) behave like a
standardised engineer:

intent → requirements → audit → plan → **approval** → build → **independent validation** → docs → memory.

| Path | What it is |
|---|---|
| `AGENTS.md` | Router: intent → Cursor mode → skills, risk lanes, gates |
| `.cursor/rules/` | Coding standards (3 always on, 11 attached by file type) |
| `.cursor/skills/` | 9 pipeline skills + 6 vetted external skills ([register](docs/EXTERNAL_SKILLS.md)) |
| `.claude/agents/` | Review gate subagents: `validator`, `code-reviewer`, `security-auditor` (run in parallel) |
| `.agent/memory/` | Team memory (decisions, conventions, gotchas), reviewed in PRs |
| `.agent/templates/` | Skeletons for the REQUIREMENTS / CODEBASE_CONTEXT / PLAN / VALIDATION artifacts |
| `docs/` | Rollout guide, skill register, testing guide, PRD (historical; `AGENTS.md` is current) |

## Use
- **Try it in Cursor:** [docs/TESTING.md](docs/TESTING.md)
- **Roll out to the team:** [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)
- **Install / update a project:** `node scripts/install.mjs <repo> [--update] [--dry-run]`. It never overwrites
  existing files.
- **Check after editing the pipeline:** `node .agent/scripts/check-pipeline.mjs && node --test scripts/pipeline.test.mjs`

## License
Pipeline files are internal to your organisation. Vendored skills keep their own MIT licenses (see `docs/licenses/` and each skill's `LICENSE`).
