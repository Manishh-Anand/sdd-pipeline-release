---
id: 0001
title: Engineering Agent Pipeline adopted
status: accepted
date: 2026-10-17
---
## Context
AI agents given the same request produced inconsistent code: duplicate components, unplanned
dependencies, skipped tests. The problem was the missing process, not the quality of the
generated code.

## Decision
All agentic work follows AGENTS.md: classify intent and risk, plan Medium/High work with
human approval, validate independently, and document and record memory.

## Consequences
Low-risk changes stay fast (the quick lane). Larger work takes one approval round-trip. Agents
must never skip validation or expand scope silently.
