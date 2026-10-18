#!/usr/bin/env node
// Generate the Cursor plugin (plugin/) from the repo's single source of truth.
// Usage: node scripts/build-plugin.mjs [--check]   (--check fails if plugin/ is out of date)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const copy = (from, to, out) => fs.cpSync(path.join(SRC, from), path.join(out, to), { recursive: true });

export const PLUGIN_NAME = 'engineering-pipeline';

export function build(out) {
  fs.rmSync(out, { recursive: true, force: true });
  const version = read('VERSION').trim();
  copy('.cursor/rules', 'rules', out);
  copy('.cursor/skills', 'skills', out);
  copy('.cursor/commands', 'commands', out);
  copy('.claude/agents', 'agents', out);
  copy('scripts/plugin-extra', '.', out);
  // Project-owned scaffold, shipped inside the init skill so it resolves relative to SKILL.md.
  copy('.agent/templates', 'skills/pipeline-init/templates', out);
  copy('.agent/memory', 'skills/pipeline-init/memory', out);
  copy('.cursor/mcp.json', 'mcp.json', out);
  copy('docs/licenses', 'licenses', out);
  // AGENTS.md is not a plugin component, so the router ships as an always-on rule.
  fs.writeFileSync(path.join(out, 'rules/pipeline-router.mdc'),
    `---\ndescription: Engineering Agent Pipeline router - intent, mode, risk lane, gates\nalwaysApply: true\n---\n${read('AGENTS.md')}`);
  fs.mkdirSync(path.join(out, '.cursor-plugin'), { recursive: true });
  fs.writeFileSync(path.join(out, '.cursor-plugin/plugin.json'), JSON.stringify({
    name: PLUGIN_NAME,
    description: 'Intent to requirements to plan to approval to build to independent validation, with unit-test generation (--ut).',
    version,
    author: { name: 'Manishh-Anand' },
    homepage: 'https://github.com/Manishh-Anand/sdd-pipeline-release',
    repository: 'https://github.com/Manishh-Anand/sdd-pipeline-release',
    keywords: ['sdd', 'workflow', 'review', 'unit-tests', 'planning'],
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'README.md'),
    `# ${PLUGIN_NAME}\n\nGenerated from the repo root by \`node scripts/build-plugin.mjs\`. Do not edit here.\n\nAfter installing, run \`/pipeline-init\` once per project.\n`);
}

function tree(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? tree(p, base) : [[path.relative(base, p).split(path.sep).join('/'), fs.readFileSync(p).toString('base64')]];
  });
}
export const stale = (committed, fresh) => JSON.stringify(tree(committed)) !== JSON.stringify(tree(fresh));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dest = path.join(SRC, 'plugin');
  if (process.argv.includes('--check')) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-'));
    build(tmp);
    if (!fs.existsSync(dest) || stale(dest, tmp)) { console.error('plugin/ is out of date: run node scripts/build-plugin.mjs'); process.exit(1); }
    console.log('plugin/ is up to date');
  } else { build(dest); console.log(`Built plugin/ (${PLUGIN_NAME} ${read('VERSION').trim()})`); }
}
