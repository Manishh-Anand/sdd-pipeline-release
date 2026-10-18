---
name: documentation
description: Create or update feature documentation in docs/features/ after a validated change that altered behaviour, contracts, setup, or architecture. Use after validation passes in the full lane; skip when nothing user- or developer-visible changed.
---
# Documentation

## Purpose
Keep one accurate, short document per feature, without duplicating code comments or other docs.

## Trigger
Full lane, after `validation` passes. The quick lane only runs it if behaviour or setup changed.

## Inputs
`REQUIREMENTS.md`, `PLAN.md`, `VALIDATION.md`, the diff, and the existing `docs/`.

## Process
1. Decide whether docs are needed: did behaviour, an API or DB contract, configuration, setup
   or architecture change? If not, record "Docs: not needed (reason)" in the final report and stop.
2. Look for an existing doc covering the feature or area. If one exists, update it; never create
   a second one.
3. Otherwise create `docs/features/<feature-slug>.md` from `.agent/templates/FEATURE_DOC.md`.
4. Fill in only the sections that have content. Link to code paths and memory decisions instead
   of copying them.
5. Update other docs that are now wrong: README setup, API docs, `.env.example`.

## Output
A new or updated `docs/features/<slug>.md`, plus any corrected existing docs.

## Guardrails
- Every command, path and name in the docs must exist in the repo (see `documentation` rule).
- No restating of code line by line, and no marketing language.
- Decisions go to `project-memory`, not into feature docs.

## Stop conditions
None. If you're unsure whether docs are needed, ask one yes/no question in the final report.
