#!/usr/bin/env node
// Install or update the pipeline in a target repo. Never overwrites local edits.
// Usage: node scripts/install.mjs <targetRepo> [--local] [--update] [--dry-run]
//   install : copies missing files; existing differing files are conflicts (left untouched).
//   --update: also replaces/removes files unchanged since the last install (tracked in .agent/pipeline-lock.json);
//             locally edited files are conflicts (left untouched).
// Exit 0 = clean, 2 = conflicts to merge by hand.
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Pipeline-owned paths, tracked in the lock and updated by --update.
const PATHS = [
  'AGENTS.md', 'CLAUDE.md', '.cursor/rules', '.cursor/skills', '.cursor/commands', '.cursor/mcp.json', '.mcp.json',
  '.claude/agents', '.agent/templates', '.sdd/work/.gitkeep',
  'docs/EXTERNAL_SKILLS.md', 'docs/licenses', '.agent/scripts/check-pipeline.mjs',
];
// Project-owned after install: copied only if missing, never tracked or updated.
const SCAFFOLD = ['.agent/memory'];
const GITIGNORE = ['.agent/work/*', '!.agent/work/.gitkeep', '.sdd/work/*', '!.sdd/work/.gitkeep'];
const LOCK = '.agent/pipeline-lock.json';

const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const posix = (rel) => rel.split(path.sep).join('/');

function walk(rel) {
  const abs = path.join(SRC, rel);
  const stat = fs.lstatSync(abs);
  if (stat.isSymbolicLink()) throw new Error(`pipeline source contains a symlink: ${rel}`);
  if (stat.isFile()) return [posix(rel)];
  if (!stat.isDirectory()) throw new Error(`pipeline source contains a non-file entry: ${rel}`);
  return fs.readdirSync(abs).flatMap((f) => walk(path.join(rel, f)));
}

function safeTargetPath(root, rel, { allowDirectory = false } = {}) {
  const normalized = posixPath(rel);
  const parts = normalized.split('/');
  if (!normalized || normalized.startsWith('/') || parts.some((part) => !part || part === '.' || part === '..') || path.posix.normalize(normalized) !== normalized)
    throw new Error(`unsafe path in installer manifest: ${rel}`);
  const targetRoot = fs.realpathSync(root);
  const result = path.resolve(targetRoot, ...parts);
  const relative = path.relative(targetRoot, result);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error(`installer path escapes target repository: ${rel}`);

  let current = targetRoot;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) { if (error.code === 'ENOENT') break; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`refusing symlink in installer path: ${path.relative(targetRoot, current)}`);
    if (i < parts.length - 1 && !stat.isDirectory())
      throw new Error(`installer parent is not a directory: ${path.relative(targetRoot, current)}`);
    if (i === parts.length - 1 && !stat.isFile() && !(allowDirectory && stat.isDirectory()))
      throw new Error(`installer target is not a regular file: ${path.relative(targetRoot, current)}`);
  }
  return result;
}

function isManagedPath(rel, local) {
  const value = posixPath(rel);
  const roots = local
    ? ['.cursor/rules/', '.cursor/skills/', '.cursor/commands/', '.claude/agents/', '.agent/templates/', '.agent/memory/']
    : ['.cursor/rules/', '.cursor/skills/', '.cursor/commands/', '.claude/agents/', '.agent/templates/', '.agent/memory/', 'docs/licenses/'];
  const exact = local
    ? new Set(['AGENTS.md', '.sdd/work/.gitkeep'])
    : new Set(['AGENTS.md', 'CLAUDE.md', '.cursor/mcp.json', '.mcp.json', '.agent/scripts/check-pipeline.mjs', '.sdd/work/.gitkeep', '.agent/work/.gitkeep', 'docs/EXTERNAL_SKILLS.md']);
  return exact.has(value) || roots.some((prefix) => value.startsWith(prefix));
}

function validateLock(lock, local) {
  if (!lock || typeof lock !== 'object' || !lock.files || typeof lock.files !== 'object' || Array.isArray(lock.files))
    throw new Error('invalid SDD pipeline install manifest');
  for (const [rel, digest] of Object.entries(lock.files)) {
    if (!isManagedPath(rel, local) || rel.split('/').some((part) => !part || part === '.' || part === '..') || path.posix.normalize(rel) !== rel || !/^[a-f0-9]{64}$/i.test(digest))
      throw new Error(`invalid SDD pipeline install manifest entry: ${rel}`);
  }
}

function gitPath(target, arg) {
  if (arg === '.') return execFileSync('git', ['-C', target, 'rev-parse', '--absolute-git-dir'], { encoding: 'utf8' }).trim();
  if (arg === '--show-toplevel') return execFileSync('git', ['-C', target, 'rev-parse', arg], { encoding: 'utf8' }).trim();
  const args = ['-C', target, 'rev-parse', '--path-format=absolute', '--git-path', arg];
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const posixPath = (value) => value.replace(/\\/g, '/');

function assertSafeGitMetadataFile(file, label) {
  const parent = path.dirname(file);
  const parentStat = fs.lstatSync(parent);
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) throw new Error(`refusing unsafe ${label} directory`);
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`refusing unsafe ${label} file`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function localPaths() {
  const files = [
    ...walk('.cursor/rules'), ...walk('.cursor/skills'), ...walk('.cursor/commands'),
    ...walk('.claude/agents'), ...walk('.agent/templates'), ...walk('.agent/memory'),
    'AGENTS.md', '.sdd/work/.gitkeep',
  ];
  return [...files, '.cursor/rules/pipeline-router.mdc'];
}

function installUnlocked(target, { dryRun = false, update = false, local = false } = {}) {
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new Error(`target is not a directory: ${target}`);
  if (path.resolve(target) === path.resolve(SRC)) throw new Error('target is the pipeline repo itself');
  const localGitDir = local ? gitPath(target, '.') : null;
  if (local && !localGitDir) throw new Error(`target is not inside a Git repository: ${target}`);
  if (local && fs.realpathSync(gitPath(target, '--show-toplevel')) !== fs.realpathSync(target))
    throw new Error(`local install target must be the Git repository root: ${target}`);
  const lockRel = local ? null : LOCK;
  const lockFile = local ? path.join(localGitDir, 'sdd-pipeline-lock.json') : safeTargetPath(target, lockRel);
  if (!local) safeTargetPath(target, lockRel);
  if (local) assertSafeGitMetadataFile(lockFile, 'SDD pipeline install manifest');
  const lockExists = fs.existsSync(lockFile);
  if (lockExists && fs.lstatSync(lockFile).isSymbolicLink()) throw new Error('refusing symlinked SDD pipeline install manifest');
  const lock = lockExists ? JSON.parse(fs.readFileSync(lockFile, 'utf8')) : { files: {} };
  validateLock(lock, local);
  const result = { copied: [], updated: [], removed: [], identical: [], conflicts: [], gitignore: [], version: fs.readFileSync(path.join(SRC, 'VERSION'), 'utf8').trim() };
  const nextLock = { version: result.version, files: {} };
  const owned = local ? localPaths() : PATHS.flatMap(walk);
  const trackedFiles = local
    ? new Set(execFileSync('git', ['-C', target, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean))
    : new Set();
  const sourceFor = (rel) => rel === '.cursor/rules/pipeline-router.mdc'
    ? null
    : path.join(SRC, rel);
  const routerSource = `---\ndescription: Engineering Agent Pipeline router - intent, mode, risk lane, gates\nalwaysApply: true\n---\n${fs.readFileSync(path.join(SRC, 'AGENTS.md'), 'utf8')}`;
  const targets = [...new Set([...owned, ...(local ? [] : SCAFFOLD.flatMap(walk))])];
  for (const rel of targets) {
    if (local && trackedFiles.has(posixPath(rel))) {
      result.conflicts.push(`${rel} (already tracked; local mode will not modify it)`);
      continue;
    }
    const from = sourceFor(rel), to = safeTargetPath(target, rel), tracked = owned.includes(rel);
    if (from) {
      const sourceStat = fs.lstatSync(from);
      if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error(`pipeline source is not a regular file: ${rel}`);
    }
    const srcHash = from ? hash(from) : crypto.createHash('sha256').update(routerSource).digest('hex');
    if (!fs.existsSync(to)) {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        safeTargetPath(target, rel);
        if (from) fs.copyFileSync(from, to); else fs.writeFileSync(to, routerSource);
      }
      result.copied.push(rel);
    }
    else if (hash(to) === srcHash) result.identical.push(rel);
    else if (tracked && update && lock.files[rel] === hash(to)) {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        safeTargetPath(target, rel);
        if (from) fs.copyFileSync(from, to); else fs.writeFileSync(to, routerSource);
      }
      result.updated.push(rel);
    }
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
      const to = safeTargetPath(target, rel);
      if (!fs.existsSync(to)) continue;
      if (local) {
        const unchanged = hash(to) === h;
        nextLock.files[rel] = h;
        result.conflicts.push(`${rel} (removed upstream; left unchanged${unchanged ? '' : ', locally edited'})`);
        continue;
      }
      if (hash(to) === h) {
        if (!dryRun) {
          fs.rmSync(to);
          // An empty skill folder left behind would fail check-pipeline, so prune empty parents.
          for (let d = path.dirname(to); d !== path.resolve(target); d = path.dirname(d)) {
            const safe = safeTargetPath(target, path.relative(target, d), { allowDirectory: true });
            if (fs.readdirSync(safe).length !== 0) break;
            fs.rmdirSync(safe);
          }
        }
        result.removed.push(rel);
      }
      else result.conflicts.push(`${rel} (removed upstream, edited locally)`);
    }
  }

  if (local) {
    const excludePath = gitPath(target, 'info/exclude');
    assertSafeGitMetadataFile(excludePath, 'Git exclude');
    const have = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8').split(/\r?\n/) : [];
    const localEntries = [...Object.keys(nextLock.files).filter((rel) => !rel.startsWith('.sdd/work/')).map((rel) => `/${posixPath(rel)}`), '/.sdd/work/'];
    const startMarker = '# BEGIN Engineering Agent Pipeline local files';
    const endMarker = '# END Engineering Agent Pipeline local files';
    const start = have.indexOf(startMarker), end = have.indexOf(endMarker);
    const userLines = start >= 0 && end > start ? [...have.slice(0, start), ...have.slice(end + 1)] : have;
    result.gitignore = localEntries.filter((entry) => !userLines.includes(entry));
    if (!dryRun) {
      const nextExclude = [...userLines, startMarker, ...localEntries, endMarker];
      if (nextExclude.join('\n') !== have.join('\n')) {
        assertSafeGitMetadataFile(excludePath, 'Git exclude');
        fs.writeFileSync(excludePath, `${nextExclude.join('\n').replace(/\n+$/, '')}\n`);
      }
      assertSafeGitMetadataFile(lockFile, 'SDD pipeline install manifest');
      if (fs.existsSync(lockFile) && fs.lstatSync(lockFile).isSymbolicLink()) throw new Error('refusing symlinked SDD pipeline install manifest');
      fs.writeFileSync(lockFile, JSON.stringify(nextLock, null, 2) + '\n');
    }
    return result;
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
    if (fs.existsSync(lockFile) && fs.lstatSync(lockFile).isSymbolicLink()) throw new Error('refusing symlinked SDD pipeline install manifest');
    fs.writeFileSync(lockFile, JSON.stringify(nextLock, null, 2) + '\n');
  }
  return result;
}

export function install(target, options = {}) {
  if (!options.local) return installUnlocked(target, options);
  const gitDir = gitPath(target, '.');
  const lockPath = path.join(gitDir, 'sdd-pipeline-install.lock');
  assertSafeGitMetadataFile(lockPath, 'SDD pipeline installer lock');
  let fd;
  try {
    fd = fs.openSync(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`another SDD pipeline installation is active, or a stale lock exists: ${lockPath}`);
    throw error;
  }
  try {
    fs.writeFileSync(fd, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`);
    return installUnlocked(target, options);
  } finally {
    const opened = fs.fstatSync(fd);
    fs.closeSync(fd);
    try {
      const current = fs.lstatSync(lockPath);
      if (!current.isSymbolicLink() && current.isFile() && current.dev === opened.dev && current.ino === opened.ino) fs.unlinkSync(lockPath);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [target, ...flags] = process.argv.slice(2);
  if (!target) { console.error('Usage: node scripts/install.mjs <targetRepo> [--local] [--update] [--dry-run]'); process.exit(1); }
  const dryRun = flags.includes('--dry-run'), update = flags.includes('--update'), local = flags.includes('--local');
  const r = install(path.resolve(target), { dryRun, update, local });
  const would = dryRun ? '[dry run] would ' : '';
  console.log(`Pipeline ${r.version}: ${would}copy ${r.copied.length}, update ${r.updated.length}, remove ${r.removed.length}; ${r.identical.length} unchanged.`);
  if (r.gitignore.length) console.log(`${would}add local Git exclusions: ${r.gitignore.join(', ')}`);
  if (r.conflicts.length) {
    console.log(`\n${r.conflicts.length} file(s) differ from the pipeline and were NOT touched. Merge them by hand:`);
    for (const c of r.conflicts) console.log(`  - ${c}`);
    if (!update) console.log('\nAlready installed? Re-run with --update to replace files you have not edited.');
    process.exit(2);
  }
  if (local) console.log('\nLocal install complete. Pipeline files are excluded via .git/info/exclude; deliberate force-add is still possible.');
  else console.log('\nNext: open a PR with these changes. Run: node .agent/scripts/check-pipeline.mjs');
}
