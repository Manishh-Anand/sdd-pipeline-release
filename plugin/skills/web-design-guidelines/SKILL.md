---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
paths: "**/*.tsx,**/*.jsx,**/*.css,**/*.html"
---
<!-- Vendored from vercel-labs/agent-skills@063bee9 + vercel-labs/web-interface-guidelines@434b7f9 (MIT). Edits: rules pinned locally in references/guidelines.md instead of fetched live (reproducible, no remote instructions). See docs/EXTERNAL_SKILLS.md. -->

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the pinned guidelines in `references/guidelines.md`
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Pinned copy: `references/guidelines.md` (upstream: vercel-labs/web-interface-guidelines `command.md`). Update it only through a reviewed PR.

## Usage

When a user provides a file or pattern argument:
1. Read `references/guidelines.md`
2. Read the specified files
3. Apply all rules from the guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
