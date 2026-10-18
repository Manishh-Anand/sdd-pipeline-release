# Tasks: <feature>
Feature id: <id> · Total tasks: <count> · Status: <pending|in_progress|completed>

## Task list
- [ ] T001 — <Title>: <actionable description> [Files: `path`] [Prereq: none] [Verify: `<command>`]
- [ ] T002 — <Title>: <actionable description> [Files: `path`] [Prereq: T001] [Verify: `<command>`]

## Consistency check
| Dimension | Status | Notes |
|---|---|---|
| Requirements coverage (AC → Tasks) | PASS/FAIL | All AC mapped to actionable tasks |
| Architecture alignment | PASS/FAIL | Layer boundaries and Avoid rules respected |
| Task dependencies | PASS/FAIL | Dependency chain is strictly ordered |
| Test coverage | PASS/FAIL | Tests included for new logic and endpoints |
| Database & migrations | PASS/FAIL | Schema change, data backfill, and rollback handled |
