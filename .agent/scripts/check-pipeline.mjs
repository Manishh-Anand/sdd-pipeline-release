#!/usr/bin/env node
// Quality gates for the Engineering Agent Pipeline. Usage: node .agent/scripts/check-pipeline.mjs [repoRoot]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const INTERNAL_SKILLS = [
  'requirements-intake', 'codebase-audit', 'architecture-review', 'tasks',
  'validation', 'code-review', 'convergence', 'documentation', 'project-memory', 'unit-testing',
];
export const RULES = [
  'engineering-core', 'security', 'csharp-dotnet', 'aspnet-core', 'ef-core',
  'sql-server', 'react', 'typescript', 'javascript', 'vite', 'python',
  'testing', 'documentation', 'ponytail',
];
const ALWAYS_ON = new Set(['engineering-core', 'security', 'ponytail']);
const SKILL_SECTIONS = ['Purpose', 'Trigger', 'Inputs', 'Process', 'Output', 'Guardrails', 'Stop conditions'];
const CAPS = { agents: 150, rule: 80, core: 60, internalSkill: 150, vendoredSkill: 350, memoryIndex: 100 };
const REQUIRED_FILES = [
  'AGENTS.md', 'CLAUDE.md', '.cursor/commands/unit-tests.md', ...['validator', 'code-reviewer', 'security-auditor', 'test-writer'].map((a) => `.claude/agents/${a}.md`),
  '.agent/memory/INDEX.md', 'docs/EXTERNAL_SKILLS.md', '.agent/scripts/check-pipeline.mjs',
  ...['INTAKE', 'REQUIREMENTS', 'CODEBASE_CONTEXT', 'PLAN', 'TASKS', 'VALIDATION', 'REVIEW', 'CONVERGENCE', 'FEATURE_DOC', 'ADR'].map((t) => `.agent/templates/${t}.md`),
];

const lines = (s) => s.replace(/\r\n/g, '\n').split('\n');

// Minimal frontmatter reader: top-level keys only; folded/multi-line values count as present.
export function frontmatter(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const l of m[1].split('\n')) {
    const kv = l.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) { key = kv[1]; fm[key] = kv[2].replace(/^["']|["']$/g, ''); }
    else if (key && l.trim() && !fm[key]) fm[key] = l.trim();
  }
  return fm;
}

export function check(root) {
  const errors = [];
  const err = (file, msg) => errors.push(`${file}: ${msg}`);
  const p = (...a) => path.join(root, ...a);
  const exists = (f) => fs.existsSync(p(f));
  const readRel = (f) => fs.readFileSync(p(f), 'utf8');

  // Structure
  for (const f of REQUIRED_FILES) if (!exists(f)) err(f, 'required file missing');
  for (const d of ['.cursor/rules', '.cursor/skills']) if (!exists(d)) { err(d, 'required directory missing'); return errors; }

  // Rules
  const ruleFiles = fs.readdirSync(p('.cursor/rules')).filter((f) => f.endsWith('.mdc'));
  for (const r of RULES) if (!ruleFiles.includes(`${r}.mdc`)) err(`.cursor/rules/${r}.mdc`, 'required rule missing');
  for (const f of ruleFiles) {
    const rel = `.cursor/rules/${f}`, text = readRel(rel), name = f.replace(/\.mdc$/, ''), fm = frontmatter(text);
    if (!fm) { err(rel, 'missing frontmatter'); continue; }
    if (!fm.description) err(rel, 'missing description');
    const always = fm.alwaysApply === 'true';
    if (always && !ALWAYS_ON.has(name)) err(rel, 'alwaysApply is reserved for engineering-core, security and ponytail (progressive loading)');
    if (!always && !fm.globs) err(rel, 'scoped rule needs globs');
    const cap = name === 'engineering-core' ? CAPS.core : CAPS.rule;
    if (lines(text).length > cap) err(rel, `${lines(text).length} lines > cap ${cap}`);
  }

  // Skills
  const register = exists('docs/EXTERNAL_SKILLS.md') ? readRel('docs/EXTERNAL_SKILLS.md') : '';
  const agents = exists('AGENTS.md') ? readRel('AGENTS.md') : '';
  const skillDirs = fs.readdirSync(p('.cursor/skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const s of INTERNAL_SKILLS) if (!skillDirs.includes(s)) err(`.cursor/skills/${s}`, 'required skill missing');
  for (const dir of skillDirs) {
    const rel = `.cursor/skills/${dir}/SKILL.md`;
    if (!exists(rel)) { err(rel, 'SKILL.md missing'); continue; }
    const text = readRel(rel), fm = frontmatter(text), n = lines(text).length;
    if (!fm) { err(rel, 'missing frontmatter'); continue; }
    if (fm.name !== dir) err(rel, `name "${fm.name}" must match folder "${dir}"`);
    if (!/^[a-z0-9-]+$/.test(fm.name ?? '')) err(rel, 'name must be lowercase letters, digits, hyphens');
    if (!fm.description) err(rel, 'missing description');
    const vendored = /<!-- Vendored from /.test(text);
    if (vendored) {
      if (n > CAPS.vendoredSkill) err(rel, `${n} lines > vendored cap ${CAPS.vendoredSkill}`);
      if (!exists(`.cursor/skills/${dir}/LICENSE`)) err(rel, 'vendored skill must keep its LICENSE');
      if (!new RegExp(`^\\| ${dir} \\|.*@ [0-9a-f]{7}`, 'm').test(register)) err(rel, 'vendored skill needs a row with a pinned commit in docs/EXTERNAL_SKILLS.md');
      if (!fm.paths && fm['disable-model-invocation'] !== 'true' && !new RegExp(`^\\| ${dir} \\|.*model \\(by description\\)`, 'm').test(register))
        err(rel, 'vendored skill must be scoped (paths), opt-in (disable-model-invocation) or registered as description-triggered');
      if (/raw\.githubusercontent\.com|Fetch fresh guidelines/.test(text)) err(rel, 'vendored skill fetches live remote instructions');
    } else {
      if (!INTERNAL_SKILLS.includes(dir)) err(rel, 'unregistered skill: add to INTERNAL_SKILLS or vendor via docs/EXTERNAL_SKILLS.md');
      if (n > CAPS.internalSkill) err(rel, `${n} lines > cap ${CAPS.internalSkill}`);
      for (const sec of SKILL_SECTIONS) if (!new RegExp(`^## ${sec}`, 'm').test(text)) err(rel, `missing section "## ${sec}"`);
      if (!agents.includes(`\`${dir}\``)) err(rel, 'internal skill is not routed from AGENTS.md');
    }
  }

  // Size of router and memory index
  if (agents && lines(agents).length > CAPS.agents) err('AGENTS.md', `${lines(agents).length} lines > cap ${CAPS.agents}`);
  if (exists('CLAUDE.md') && !/^@AGENTS\.md/m.test(readRel('CLAUDE.md'))) err('CLAUDE.md', 'must import @AGENTS.md (single source)');
  if (exists('.agent/memory/INDEX.md')) {
    const idx = readRel('.agent/memory/INDEX.md');
    if (lines(idx).length > CAPS.memoryIndex) err('.agent/memory/INDEX.md', `> ${CAPS.memoryIndex} lines`);
    for (const [, link] of idx.matchAll(/\]\(([^)]+)\)/g)) if (!exists(`.agent/memory/${link}`)) err('.agent/memory/INDEX.md', `broken link ${link}`);
  }

  // No duplicated instructions: any 3 consecutive non-trivial lines shared between internal files
  const internal = [
    'AGENTS.md',
    ...ruleFiles.map((f) => `.cursor/rules/${f}`),
    ...INTERNAL_SKILLS.map((s) => `.cursor/skills/${s}/SKILL.md`),
  ].filter(exists);
  const seen = new Map();
  for (const f of internal) {
    const ls = lines(readRel(f)).map((l) => l.trim().toLowerCase()).filter((l) => l.length > 25 && !/^[-|#`>]*$/.test(l));
    for (let i = 0; i + 3 <= ls.length; i++) {
      const key = ls.slice(i, i + 3).join('\n');
      const prev = seen.get(key);
      if (prev && prev !== f) err(f, `duplicates 3+ lines from ${prev}: "${ls[i].slice(0, 60)}…"`);
      else seen.set(key, f);
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'));
  const errors = check(root);
  if (errors.length) {
    console.error(`Pipeline check FAILED (${errors.length}):\n` + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('Pipeline check PASSED');
}
