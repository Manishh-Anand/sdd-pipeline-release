# Decision 0002: Local SDD bootstrap

## Decision
Support a no-admin Cursor workflow by fetching the pipeline repository and copying only an explicit runtime allowlist into an existing Git repository. Keep installed runtime files in `.git/info/exclude`, keep installer metadata inside `.git/`, and keep generated pipeline scratch artifacts in ignored `.sdd/work/<feature-id>/`. Durable feature docs belong in `docs/features/`, and generated tests follow the host project's test conventions.

## Why
Teammates may not have permission to install Cursor plugins. A local repository runtime makes the process available without copying release tooling or modifying the host project's shared `.gitignore`. A separate administrator/plugin distribution remains supported.

## Guardrails
- Existing target files are never overwritten without an explicit safe update; conflicts are reported.
- Already tracked project files are not modified by local mode.
- The per-repository exclusive lock prevents overlapping runs of this installer; a stale lock must be reviewed before removal.
- Git exclusions prevent ordinary staging, not deliberate `git add -f`.
- A non-cooperating process that mutates the same paths during installation is outside the assumed local developer workflow.
