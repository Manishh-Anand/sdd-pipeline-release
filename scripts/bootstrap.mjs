#!/usr/bin/env node
// Fetch the canonical pipeline and install its Cursor runtime locally into an existing Git repo.
// Usage: node scripts/bootstrap.mjs <targetRepo> [--ref <ref>] [--update] [--dry-run]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SOURCE = 'https://github.com/Manishh-Anand/sdd-pipeline-release.git';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

export function bootstrap(target, { ref, update = false, dryRun = false, clone = run, execute = run, resolveRevision = (dir) => execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), tempRoot = os.tmpdir() } = {}) {
  const temp = fs.mkdtempSync(path.join(tempRoot, 'sdd-pipeline-source-'));
  try {
    const sourceRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    const sourceRef = ref ?? resolveRevision(sourceRoot);
    clone('git', ['init', '--quiet', temp]);
    clone('git', ['-C', temp, 'fetch', '--quiet', '--depth', '1', SOURCE, sourceRef]);
    clone('git', ['-C', temp, 'checkout', '--quiet', '--detach', 'FETCH_HEAD']);
    const resolvedRef = resolveRevision(temp);
    console.log(`Installing SDD pipeline from ${SOURCE}@${resolvedRef}`);
    const installer = path.join(temp, 'scripts', 'install.mjs');
    const args = [installer, path.resolve(target), '--local'];
    if (update) args.push('--update');
    if (dryRun) args.push('--dry-run');
    execute(process.execPath, args);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [target, ...flags] = process.argv.slice(2);
  if (!target) {
    console.error('Usage: node scripts/bootstrap.mjs <targetRepo> [--ref <branch-or-tag-or-commit>] [--update] [--dry-run]');
    process.exit(1);
  }
  const refIndex = flags.indexOf('--ref');
  const ref = refIndex >= 0 ? flags[refIndex + 1] : undefined;
  if (refIndex >= 0 && !ref) throw new Error('--ref requires a branch or tag');
  bootstrap(target, { ref, update: flags.includes('--update'), dryRun: flags.includes('--dry-run') });
}
