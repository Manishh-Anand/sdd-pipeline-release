---
name: project-memory
description: Read and maintain the team's git-tracked project memory in .agent/memory/ (decisions, conventions, gotchas). Use at the start of every task to load only relevant entries, and at the end of a validated task to propose 0-3 new one-fact entries for human review.
---
# Project memory

## Purpose
Give every developer's agent the same durable knowledge across sessions: why things are the way
they are, and what bit us before. Cursor has no native memory (it was removed in 2.1), so this
is it.

## Trigger
- **Read**: at the start of every task (AGENTS.md §1).
- **Write**: after `validation` passes, or after a bug has been root-caused.

## Layout
```
.agent/memory/
  INDEX.md          # one line per entry: - [Title](path) — hook   (≤ 100 lines)
  conventions.md    # project-specific conventions not obvious from code
  gotchas.md        # traps: "X looks reusable but Y"; flaky test causes; env quirks
  decisions/NNNN-slug.md   # ADR-lite: context, decision, consequences, status
```

## Inputs
`.agent/memory/` and the current task. For writes, also `VALIDATION.md` or the root-cause notes.

## Process
### Read
1. Read `INDEX.md` only.
2. Open the entries whose hook matches the task's area, at most 5.
3. Treat each entry as true *as of when it was written*. If it names a file or function, check
   that it still exists before relying on it.

### Write
1. Write only facts that were **non-obvious and will matter again**:
   - a decision and its reason;
   - a convention the code doesn't make obvious;
   - a gotcha that cost time.
2. Never write things the code, git history or docs already record, task progress, or
   one-off details.
3. Check for an existing entry first. Update or supersede it (set `status: superseded by NNNN`)
   rather than duplicating it.
4. Use the template:
   - decisions follow `.agent/templates/ADR.md`, with the next number;
   - conventions and gotchas are one bullet each, with a **Why:** line.
5. Add or adjust the one-line pointer in `INDEX.md`.
6. List the proposed entries in the final report. They are committed in the same PR, so a human
   reviews them.

## Output
At most 3 small memory changes per task, plus the INDEX lines that point to them.

## Guardrails
- No secrets, credentials, customer data or personal names.
- One fact per bullet. Keep each decision file under 40 lines.
- Delete entries that turn out to be wrong. Wrong memory is worse than none.

## Stop conditions
A new fact contradicts an `accepted` decision. Don't overwrite it; raise the conflict with the
developer.
