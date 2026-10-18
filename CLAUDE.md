@AGENTS.md

## Claude Code bridge
Cursor discovers the files below natively. Claude Code does not, so it loads them by path:
- **Skills**: when AGENTS.md names a skill, read `.cursor/skills/<name>/SKILL.md`, and also any
  vendored skill whose `paths` frontmatter matches the files you are touching.
- **Rules**: before editing a file, read `.cursor/rules/engineering-core.mdc` and
  `security.mdc`. Then read every other `.cursor/rules/*.mdc` whose `globs` match that file, and
  only those.
- **Subagents**: `.claude/agents/` (`validator`, `code-reviewer`, `security-auditor`) is native to
  both tools. Use all three for the review gate.
