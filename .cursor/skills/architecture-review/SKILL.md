---
name: architecture-review
description: Decide whether a proposed solution fits the existing system - classify every element as Reuse / Modify / Create / Avoid, check layer placement and dependency direction, assign the risk class, and produce impact analysis for High-risk changes. Use after codebase-audit and before writing the implementation plan; code-review re-checks the result.
---
# Architecture review

## Purpose
Make sure the plan extends the existing architecture instead of growing a parallel one.

## Trigger
Full lane, between `codebase-audit` and the plan. `code-review` re-checks the finished code
against this review.

## Inputs
`REQUIREMENTS.md`, `CODEBASE_CONTEXT.md`, and `.agent/memory/decisions/`.

## Process
0. **Greenfield** (the audit reported `GREENFIELD`): take the stack and layout chosen in intake
   item 7 from `references/default-layouts.md`. Everything is **Create**. The plan's first step
   is the scaffold plus its tooling.
1. Draft the solution shape: the components, endpoints, services and data changes it needs.
2. Classify each element:
   - **Reuse**: an existing thing used as-is (name it, with its path).
   - **Modify**: an existing thing extended (say what changes).
   - **Create**: genuinely new. Justify why nothing existing fits.
   - **Avoid**: tempting but wrong (duplicate service, new state library, new DbContext…).
3. Check that each Create/Modify:
   - sits in the correct layer and folder, following the traced pattern;
   - keeps dependencies pointing the same way as existing code (UI → API client → endpoint →
     service → data);
   - follows existing API conventions, data-access approach, UI and state architecture;
   - does not contradict a recorded decision. If it does, use the precedence rule in
     `engineering-core`.
4. Assign the risk class from AGENTS.md §3, using the highest element.
5. **High risk**: add an impact analysis:
   - what is affected (callers, consumers, data);
   - migration and backfill;
   - backwards compatibility;
   - rollback;
   - who must approve.
6. Write the result into the `Approach`, `Create`/`Modify`/`Reuse` and `Risks` sections of
   `PLAN.md`. There is no separate file.

## Output
The Reuse/Modify/Create/Avoid table, the risk class, and the impact analysis (High only), all
inside `PLAN.md`.

## Guardrails
- Existing architecture wins over generic best practice. Suggest improvements as Risks or
  follow-ups, never as silent scope.
- Do not propose a new dependency, layer or pattern unless an existing one cannot meet a stated
  requirement.

## Stop conditions
The only workable design needs an architecture change (new layer, new service boundary, changed
dependency direction). Present the options and the trade-offs, and let the developer decide.
