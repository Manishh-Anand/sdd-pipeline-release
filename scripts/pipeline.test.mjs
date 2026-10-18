// Self-tests for the pipeline tooling. Run: node --test scripts/
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../.agent/scripts/check-pipeline.mjs';
import { install } from './install.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COPY = ['AGENTS.md', 'CLAUDE.md', '.cursor', '.claude', '.agent', 'docs'];

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-'));
  for (const p of COPY) fs.cpSync(path.join(ROOT, p), path.join(dir, p), { recursive: true });
  return dir;
}
const edit = (dir, rel, fn) => fs.writeFileSync(path.join(dir, rel), fn(fs.readFileSync(path.join(dir, rel), 'utf8')));
const expectError = (dir, re) => assert.ok(check(dir).some((e) => re.test(e)), `expected ${re} in:\n${check(dir).join('\n')}`);

test('the repo itself passes', () => assert.deepEqual(check(ROOT), []));

test('missing required skill fails', () => {
  const d = fixture();
  fs.rmSync(path.join(d, '.cursor/skills/validation'), { recursive: true });
  expectError(d, /validation: required skill missing/);
});

test('skill name must match folder', () => {
  const d = fixture();
  edit(d, '.cursor/skills/documentation/SKILL.md', (s) => s.replace('name: documentation', 'name: docs'));
  expectError(d, /must match folder/);
});

test('oversized skill fails', () => {
  const d = fixture();
  edit(d, '.cursor/skills/codebase-audit/SKILL.md', (s) => s + '\nfiller line\n'.repeat(120));
  expectError(d, /codebase-audit\/SKILL.md: \d+ lines > cap 150/);
});

test('extra alwaysApply rule fails (progressive loading)', () => {
  const d = fixture();
  edit(d, '.cursor/rules/react.mdc', (s) => s.replace('alwaysApply: false', 'alwaysApply: true'));
  expectError(d, /react.mdc: alwaysApply is reserved/);
});

test('instructions duplicated between a skill and a rule fail', () => {
  const d = fixture();
  const block = fs.readFileSync(path.join(d, '.cursor/rules/engineering-core.mdc'), 'utf8').split('## Reuse before create')[1].split('## Scope')[0];
  edit(d, '.cursor/skills/documentation/SKILL.md', (s) => s + '\n' + block);
  expectError(d, /duplicates 3\+ lines/);
});

test('unregistered vendored skill fails', () => {
  const d = fixture();
  fs.mkdirSync(path.join(d, '.cursor/skills/random-skill'));
  fs.writeFileSync(path.join(d, '.cursor/skills/random-skill/SKILL.md'), '---\nname: random-skill\ndescription: x\n---\n<!-- Vendored from someone/repo@abc1234 -->\n');
  expectError(d, /random-skill.*LICENSE/);
  expectError(d, /random-skill.*docs\/EXTERNAL_SKILLS.md/);
});

test('installer copies, never overwrites, reports conflicts, is idempotent', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
  fs.writeFileSync(path.join(t, 'AGENTS.md'), '# existing project agents file\n');
  fs.writeFileSync(path.join(t, '.gitignore'), 'node_modules/');
  const r1 = install(t);
  assert.deepEqual(r1.conflicts, ['AGENTS.md']);
  assert.equal(fs.readFileSync(path.join(t, 'AGENTS.md'), 'utf8'), '# existing project agents file\n');
  assert.ok(r1.copied.includes('.cursor/skills/validation/SKILL.md'));
  assert.match(fs.readFileSync(path.join(t, '.gitignore'), 'utf8'), /node_modules\/\n# Engineering.*\n\.agent\/work\/\*\n/);
  const r2 = install(t);
  assert.equal(r2.copied.length, 0);
  assert.deepEqual(r2.gitignore, []);
  // Once the conflict is resolved the installed tree passes the quality gates
  fs.copyFileSync(path.join(ROOT, 'AGENTS.md'), path.join(t, 'AGENTS.md'));
  assert.deepEqual(check(t), []);
});

test('--update replaces untouched files, keeps local edits, removes dropped files, leaves memory alone', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
  install(t);
  const lockPath = path.join(t, '.agent/pipeline-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(t, rel)), { recursive: true }); fs.writeFileSync(path.join(t, rel), text); };

  put('.cursor/rules/react.mdc', 'old upstream version\n');          // untouched since an older install
  lock.files['.cursor/rules/react.mdc'] = sha('old upstream version\n');
  put('.cursor/rules/vite.mdc', 'team edited this\n');                // local edit, lock still has upstream hash
  put('.cursor/skills/old-skill/SKILL.md', 'dropped upstream\n');     // removed upstream, untouched
  lock.files['.cursor/skills/old-skill/SKILL.md'] = sha('dropped upstream\n');
  put('.cursor/skills/gone/SKILL.md', 'edited after install\n');      // removed upstream, edited
  lock.files['.cursor/skills/gone/SKILL.md'] = sha('original\n');
  put('.agent/memory/conventions.md', '# Conventions\n- ours\n');    // project-owned memory
  fs.writeFileSync(lockPath, JSON.stringify(lock));

  const r = install(t, { update: true });
  assert.deepEqual(r.updated, ['.cursor/rules/react.mdc']);
  assert.equal(fs.readFileSync(path.join(t, '.cursor/rules/react.mdc'), 'utf8'), fs.readFileSync(path.join(ROOT, '.cursor/rules/react.mdc'), 'utf8'));
  assert.ok(r.conflicts.includes('.cursor/rules/vite.mdc'));
  assert.equal(fs.readFileSync(path.join(t, '.cursor/rules/vite.mdc'), 'utf8'), 'team edited this\n');
  assert.deepEqual(r.removed, ['.cursor/skills/old-skill/SKILL.md']);
  assert.ok(!fs.existsSync(path.join(t, '.cursor/skills/old-skill')), 'empty skill folder pruned');
  assert.ok(r.conflicts.some((c) => c.startsWith('.cursor/skills/gone/SKILL.md')));
  assert.equal(fs.readFileSync(path.join(t, '.agent/memory/conventions.md'), 'utf8'), '# Conventions\n- ours\n');
  assert.ok(!r.conflicts.includes('.agent/memory/conventions.md'));
  // the edited file keeps its old baseline, so it stays a conflict on the next update too
  assert.ok(install(t, { update: true }).conflicts.includes('.cursor/rules/vite.mdc'));
});
