---
name: pipeline-init
description: Set up the project-owned half of the Engineering Agent Pipeline in the current repo - .agent/memory, .agent/templates, .agent/work and .gitignore entries. Run once per project after installing the plugin, via /pipeline-init.
disable-model-invocation: true
---
# Pipeline init

Run once per repo. The plugin supplies rules, skills, subagents and commands; this skill creates
the files that belong to the project.

1. Copy `memory/` (next to this file) to `.agent/memory/` in the repo root. Skip any file that
   already exists; never overwrite.
2. Copy `templates/` (next to this file) to `.agent/templates/`, same no-overwrite rule.
3. Create `.agent/work/.gitkeep` if missing.
4. Append these lines to `.gitignore` if they are not already present:
   ```
   # Engineering Agent Pipeline working artifacts
   .agent/work/*
   !.agent/work/.gitkeep
   ```
5. Report what was created and what was skipped. Tell the developer to add 3-10 conventions to
   `.agent/memory/conventions.md` and known traps to `gotchas.md`, then commit the result.
