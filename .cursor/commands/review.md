---
name: review
description: Run the three-agent review gate (validator, code-reviewer, security-auditor) on the current diff.
---
Run the review gate from AGENTS.md on `git diff HEAD`: launch `validator`, `code-reviewer` and `security-auditor` in parallel, each in a fresh context. Save `VALIDATION.md`, `REVIEW.md` and `SECURITY.md` in `.agent/work/<id>/` (create the folder if needed). Report PASS/FAIL per reviewer and show the "Validation failed" menu if any fail. Do not edit source.
