// Self-tests for the pipeline tooling. Run: node --test scripts/
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../.agent/scripts/check-pipeline.mjs';
import { install } from './install.mjs';
import { bootstrap, SOURCE } from './bootstrap.mjs';
import { build, stale } from './build-plugin.mjs';

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
  assert.match(fs.readFileSync(path.join(t, '.gitignore'), 'utf8'), /node_modules\/[\s\S]*\.sdd\/work\/\*\n/);
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

test('unit-test support is wired: skill, agent and command', () => {
  for (const f of ['.cursor/skills/unit-testing/SKILL.md', '.claude/agents/test-writer.md', '.cursor/commands/unit-tests.md'])
    assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  assert.match(fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8'), /`\/unit-tests`/);
  const d = fixture();
  fs.rmSync(path.join(d, '.cursor/skills/unit-testing'), { recursive: true });
  expectError(d, /unit-testing: required skill missing/);
});

test('command must be named after its file and listed in AGENTS.md', () => {
  const d = fixture();
  edit(d, '.cursor/commands/review.md', (s) => s.replace('name: review', 'name: reviews'));
  expectError(d, /review.md: frontmatter name/);
  const e = fixture();
  edit(e, 'AGENTS.md', (s) => s.replace('`/converge`', '`/c`'));
  expectError(e, /converge.md: command is not listed/);
});

test('installer ships the commands folder', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
  assert.ok(install(t).copied.includes('.cursor/commands/unit-tests.md'));
});

test('local install copies only runtime files and keeps them out of normal Git status', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-local-'));
  execFileSync('git', ['init', '--quiet', t]);
  fs.writeFileSync(path.join(t, '.gitignore'), 'existing-ignore\n');
  execFileSync('git', ['-C', t, 'add', '.gitignore']);
  fs.writeFileSync(path.join(t, '.git/info/exclude'), '# developer local exclusion\n/private-file\n');
  const r = install(t, { local: true });
  assert.deepEqual(r.conflicts, []);
  assert.ok(r.copied.includes('.cursor/rules/pipeline-router.mdc'));
  assert.ok(r.copied.includes('.cursor/skills/validation/SKILL.md'));
  assert.ok(r.copied.includes('.claude/agents/validator.md'));
  assert.ok(r.copied.includes('.agent/templates/PLAN.md'));
  assert.ok(r.copied.includes('.agent/memory/INDEX.md'));
  assert.ok(r.copied.includes('AGENTS.md'));
  assert.ok(!r.copied.some((f) => f.startsWith('docs/')));
  assert.ok(!r.copied.includes('.agent/scripts/check-pipeline.mjs'));
  assert.ok(!r.copied.some((f) => f.includes('mcp.json')));
  assert.equal(fs.readFileSync(path.join(t, '.gitignore'), 'utf8'), 'existing-ignore\n');
  const exclude = fs.readFileSync(path.join(t, '.git/info/exclude'), 'utf8');
  assert.match(exclude, /BEGIN Engineering Agent Pipeline local files/);
  assert.match(exclude, /# developer local exclusion\n\/private-file/);
  assert.deepEqual(execFileSync('git', ['-C', t, 'status', '--short', '--untracked-files=all'], { encoding: 'utf8' }).trim(), 'A  .gitignore');
  assert.match(execFileSync('git', ['-C', t, 'check-ignore', '.cursor/rules/engineering-core.mdc', '.agent/templates/PLAN.md', '.sdd/work/example/PLAN.md'], { encoding: 'utf8' }), /\.cursor\/rules\/engineering-core\.mdc[\r\n]/);
  assert.ok(fs.existsSync(path.join(t, '.git/sdd-pipeline-lock.json')));
  assert.ok(!fs.existsSync(path.join(t, '.agent/pipeline-lock.json')));
});

test('local update keeps removed pipeline files local, including edited files, then drops ignores when absent', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-local-'));
  execFileSync('git', ['init', '--quiet', t]);
  install(t, { local: true });
  const rel = '.cursor/skills/retired/SKILL.md';
  const file = path.join(t, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'retired pipeline skill\n');
  const lockFile = path.join(t, '.git/sdd-pipeline-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  lock.files[rel] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  fs.writeFileSync(lockFile, JSON.stringify(lock));

  const editedRel = '.cursor/skills/retired-edited/SKILL.md';
  const editedFile = path.join(t, editedRel);
  fs.mkdirSync(path.dirname(editedFile), { recursive: true });
  fs.writeFileSync(editedFile, 'edited retired pipeline skill\n');
  lock.files[editedRel] = crypto.createHash('sha256').update('original retired skill\n').digest('hex');
  fs.writeFileSync(lockFile, JSON.stringify(lock));

  const updated = install(t, { local: true, update: true });
  assert.ok(updated.conflicts.includes(`${rel} (removed upstream; left unchanged)`));
  assert.ok(updated.conflicts.includes(`${editedRel} (removed upstream; left unchanged, locally edited)`));
  assert.equal(fs.readFileSync(file, 'utf8'), 'retired pipeline skill\n');
  assert.match(execFileSync('git', ['-C', t, 'check-ignore', rel], { encoding: 'utf8' }), /retired\/SKILL\.md/);
  assert.match(execFileSync('git', ['-C', t, 'check-ignore', editedRel], { encoding: 'utf8' }), /retired-edited\/SKILL\.md/);

  fs.rmSync(file);
  install(t, { local: true, update: true });
  assert.doesNotMatch(fs.readFileSync(path.join(t, '.git/info/exclude'), 'utf8'), /retired\/SKILL\.md/);
  assert.match(execFileSync('git', ['-C', t, 'check-ignore', editedRel], { encoding: 'utf8' }), /retired-edited\/SKILL\.md/);
});

test('local install refuses a symlinked Git exclude file', (tcase) => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-local-'));
  const outside = path.join(t, 'outside-exclude');
  execFileSync('git', ['init', '--quiet', t]);
  fs.writeFileSync(outside, 'leave me alone\n');
  fs.rmSync(path.join(t, '.git/info/exclude'));
  try { fs.symlinkSync(outside, path.join(t, '.git/info/exclude')); }
  catch (error) { if (['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) return tcase.skip('symlink creation is unavailable'); throw error; }
  assert.throws(() => install(t, { local: true }), /refusing unsafe Git exclude file/);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'leave me alone\n');
});

test('local install preserves conflicts and is idempotent', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-local-'));
  execFileSync('git', ['init', '--quiet', t]);
  fs.mkdirSync(path.join(t, '.cursor/rules'), { recursive: true });
  fs.writeFileSync(path.join(t, '.cursor/rules/security.mdc'), 'project rule\n');
  const first = install(t, { local: true });
  assert.ok(first.conflicts.includes('.cursor/rules/security.mdc'));
  assert.equal(fs.readFileSync(path.join(t, '.cursor/rules/security.mdc'), 'utf8'), 'project rule\n');
  const second = install(t, { local: true });
  assert.equal(second.copied.length, 0);
  assert.ok(second.identical.length > 0);
  assert.ok(second.conflicts.includes('.cursor/rules/security.mdc'));
});

test('local install does not modify or exclude pipeline paths already tracked by the project', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-local-'));
  execFileSync('git', ['init', '--quiet', t]);
  const file = path.join(t, '.cursor/skills/validation/SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'project-owned tracked file\n');
  execFileSync('git', ['-C', t, 'add', '.cursor/skills/validation/SKILL.md']);
  const r = install(t, { local: true });
  assert.ok(r.conflicts.includes('.cursor/skills/validation/SKILL.md (already tracked; local mode will not modify it)'));
  assert.equal(fs.readFileSync(file, 'utf8'), 'project-owned tracked file\n');
  assert.doesNotMatch(fs.readFileSync(path.join(t, '.git/info/exclude'), 'utf8'), /skills\/validation\/SKILL\.md/);
});

test('local install requires an existing Git repository', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-local-'));
  assert.throws(() => install(t, { local: true }));
});

test('local install refuses to overlap an existing installer lock', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-local-'));
  execFileSync('git', ['init', '--quiet', t]);
  const lock = path.join(t, '.git/sdd-pipeline-install.lock');
  fs.writeFileSync(lock, '{"pid":1}\n');
  assert.throws(() => install(t, { local: true }), /another SDD pipeline installation is active, or a stale lock exists/);
  assert.equal(fs.readFileSync(lock, 'utf8'), '{"pid":1}\n');
});

test('update rejects unsafe paths in a corrupted install manifest', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'target-lock-'));
  fs.mkdirSync(path.join(t, '.agent'), { recursive: true });
  fs.writeFileSync(path.join(t, '.agent/pipeline-lock.json'), JSON.stringify({ files: { '../../outside.txt': '0'.repeat(64) } }));
  assert.throws(() => install(t, { update: true }), /invalid SDD pipeline install manifest entry/);
});

test('bootstrap fetches the selected source ref, invokes local install, and cleans its clone', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-test-'));
  const calls = [];
  bootstrap('C:/project', {
    ref: 'v2.5.0', update: true, dryRun: true, tempRoot,
    clone: (command, args) => calls.push({ command, args }),
    execute: (command, args) => calls.push({ command, args }),
    resolveRevision: () => 'abcdef0123456789abcdef0123456789abcdef01',
  });
  assert.deepEqual(calls[0].args.slice(0, 3), ['init', '--quiet', calls[0].args[2]]);
  assert.deepEqual(calls[1].args.slice(2), ['fetch', '--quiet', '--depth', '1', SOURCE, 'v2.5.0']);
  assert.deepEqual(calls[2].args.slice(2), ['checkout', '--quiet', '--detach', 'FETCH_HEAD']);
  assert.equal(calls[3].args[0].endsWith(path.join('scripts', 'install.mjs')), true);
  assert.deepEqual(calls[3].args.slice(1), [path.resolve('C:/project'), '--local', '--update', '--dry-run']);
  assert.deepEqual(fs.readdirSync(tempRoot), []);
});

test('bootstrap cleans the temporary clone when source acquisition fails', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-test-'));
  assert.throws(() => bootstrap('C:/project', { tempRoot, clone: () => { throw new Error('network unavailable'); } }), /network unavailable/);
  assert.deepEqual(fs.readdirSync(tempRoot), []);
});

test('plugin/ is in sync with the sources and the manifests are valid', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-'));
  build(tmp);
  assert.ok(!stale(path.join(ROOT, 'plugin'), tmp), 'plugin/ is stale: run node scripts/build-plugin.mjs');
  const manifest = JSON.parse(fs.readFileSync(path.join(tmp, '.cursor-plugin/plugin.json'), 'utf8'));
  const market = JSON.parse(fs.readFileSync(path.join(ROOT, '.cursor-plugin/marketplace.json'), 'utf8'));
  const kebab = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
  assert.match(manifest.name, kebab);
  assert.equal(manifest.version, fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim());
  assert.match(market.name, kebab);
  assert.ok(market.owner.name);
  for (const p of market.plugins) {
    assert.match(p.name, kebab);
    assert.equal(p.name, manifest.name);
    assert.ok(fs.existsSync(path.join(ROOT, p.source, '.cursor-plugin/plugin.json')), `source ${p.source}`);
  }
  assert.match(fs.readFileSync(path.join(tmp, 'rules/pipeline-router.mdc'), 'utf8'), /^---\r?\ndescription: .*\r?\nalwaysApply: true\r?\n---\r?\n# Engineering Agent Pipeline/);
  for (const f of ['skills/pipeline-init/templates/PLAN.md', 'skills/pipeline-init/memory/INDEX.md', 'agents/test-writer.md']) assert.ok(fs.existsSync(path.join(tmp, f)), f);
});
