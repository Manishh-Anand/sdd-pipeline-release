#!/usr/bin/env node
// Install or update the pipeline in a target repo. Never overwrites local edits.
// Usage: node scripts/install.mjs <targetRepo> [--update] [--dry-run]
//   install : copies missing files; existing differing files are conflicts (left untouched).
//   --update: also replaces/removes files unchanged since the last install (tracked in .agent/pipeline-lock.json);
//             locally edited files are conflicts (left untouched).
// Exit 0 = clean, 2 = conflicts to merge by hand.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Pipeline-owned paths, tracked in the lock and updated by --update.
const PATHS = [
  'AGENTS.md', 'CLAUDE.md', '.cursor/rules', '.cursor/skills', '.cursor/mcp.json', '.mcp.json',
  '.claude/agents', '.agent/templates', '.agent/work/.gitkeep',
  'docs/EXTERNAL_SKILLS.md', 'docs/licenses', '.agent/scripts/check-pipeline.mjs',
];
// Project-owned after install: copied only if missing, never tracked or updated.
const SCAFFOLD = ['.agent/memory'];
const GITIGNORE = ['.agent/work/*', '!.agent/work/.gitkeep'];
const LOCK = '.agent/pipeline-lock.json';

const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const posix = (rel) => rel.split(path.sep).join('/');

function walk(rel) {
  const abs = path.join(SRC, rel);
  if (fs.statSync(abs).isFile()) return [posix(rel)];
  return fs.readdirSync(abs).flatMap((f) => walk(path.join(rel, f)));
}

export function install(target, { dryRun = false, update = false } = {}) {
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new Error(`target is not a directory: ${target}`);
  if (path.resolve(target) === path.resolve(SRC)) throw new Error('target is the pipeline repo itself');
  const lockFile = path.join(target, LOCK);
  const lock = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile, 'utf8')) : { files: {} };
  const result = { copied: [], updated: [], removed: [], identical: [], conflicts: [], gitignore: [], version: fs.readFileSync(path.join(SRC, 'VERSION'), 'utf8').trim() };
  const nextLock = { version: result.version, files: {} };
  const write = (from, to) => { if (!dryRun) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); } };

  const owned = PATHS.flatMap(walk);
  for (const rel of [...owned, ...SCAFFOLD.flatMap(walk)]) {
    const from = path.join(SRC, rel), to = path.join(target, rel), tracked = owned.includes(rel);
    const srcHash = hash(from);
    if (!fs.existsSync(to)) { write(from, to); result.copied.push(rel); }
    else if (hash(to) === srcHash) result.identical.push(rel);
    else if (tracked && update && lock.files[rel] === hash(to)) { write(from, to); result.updated.push(rel); }
    else if (tracked || !update) {
      result.conflicts.push(rel);
      if (lock.files[rel]) nextLock.files[rel] = lock.files[rel]; // keep the baseline so a later update can still tell it was edited
      continue;
    } else continue; // scaffold file the project has made its own: leave it alone
    if (tracked) nextLock.files[rel] = srcHash;
  }

  // Files the pipeline no longer ships: delete if untouched, otherwise flag.
  if (update) {
    for (const [rel, h] of Object.entries(lock.files)) {
      if (owned.includes(rel)) continue;
      const to = path.join(target, rel);
      if (!fs.existsSync(to)) continue;
      if (hash(to) === h) {
        if (!dryRun) {
          fs.rmSync(to);
          // An empty skill folder left behind would fail check-pipeline, so prune empty parents.
          for (let d = path.dirname(to); d !== target && fs.readdirSync(d).length === 0; d = path.dirname(d)) fs.rmdirSync(d);
        }
        result.removed.push(rel);
      }
      else result.conflicts.push(`${rel} (removed upstream, edited locally)`);
    }
  }

  const gi = path.join(target, '.gitignore');
  const have = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8').split(/\r?\n/) : [];
  result.gitignore = GITIGNORE.filter((l) => !have.includes(l));
  if (!dryRun) {
    if (result.gitignore.length) {
      const prefix = have.length && have.at(-1) !== '' ? '\n' : '';
      fs.appendFileSync(gi, `${prefix}# Engineering Agent Pipeline working artifacts\n${result.gitignore.join('\n')}\n`);
    }
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, JSON.stringify(nextLock, null, 2) + '\n');
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [target, ...flags] = process.argv.slice(2);
  if (!target) { console.error('Usage: node scripts/install.mjs <targetRepo> [--update] [--dry-run]'); process.exit(1); }
  const dryRun = flags.includes('--dry-run'), update = flags.includes('--update');
  const r = install(path.resolve(target), { dryRun, update });
  const would = dryRun ? '[dry run] would ' : '';
  console.log(`Pipeline ${r.version}: ${would}copy ${r.copied.length}, update ${r.updated.length}, remove ${r.removed.length}; ${r.identical.length} unchanged.`);
  if (r.gitignore.length) console.log(`${would}add to .gitignore: ${r.gitignore.join(', ')}`);
  if (r.conflicts.length) {
    console.log(`\n${r.conflicts.length} file(s) differ from the pipeline and were NOT touched. Merge them by hand:`);
    for (const c of r.conflicts) console.log(`  - ${c}`);
    if (!update) console.log('\nAlready installed? Re-run with --update to replace files you have not edited.');
    process.exit(2);
  }
  console.log('\nNext: open a PR with these changes. Run: node .agent/scripts/check-pipeline.mjs');
}
