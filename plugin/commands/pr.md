---
name: pr
description: Draft a pull request title and description from the diff and the feature's pipeline artifacts.
---
Draft a PR description for the current branch against the default branch (`git diff <base>...HEAD`, `git log`). If a feature folder exists in `.sdd/work/` (latest, or the one I name), take the summary from `REQUIREMENTS.md` and `PLAN.md`, and the results from `VALIDATION.md`, `REVIEW.md`, `SECURITY.md` and `CONVERGENCE.md`.

Output, in this order: a title under 70 characters; **What and why** (3-5 lines); **Changes** (grouped file list); **Testing** (checks run and their results; say plainly which did not run or failed); **Risks and rollout** (schema, breaking API, config); **Reviewer notes** (where to look first). Never report a check as passed without its artifact or a command result.

Print it for me to copy. Do not push, open the PR, or edit files unless I ask.
