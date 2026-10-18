#!/usr/bin/env node
// One-command entry point for npx GitHub installs into an existing project.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { install } from './install.mjs';

export function main(args = process.argv.slice(2)) {
  const [targetArg = '.', ...flags] = args;
  const local = true;
  const dryRun = flags.includes('--dry-run');
  const update = flags.includes('--update');
  const result = install(path.resolve(targetArg), { local, dryRun, update });
  const prefix = dryRun ? '[dry run] would ' : '';
  console.log(`SDD pipeline ${result.version}: ${prefix}copy ${result.copied.length}, update ${result.updated.length}; ${result.identical.length} unchanged.`);
  if (result.conflicts.length) {
    console.log(`\n${result.conflicts.length} file(s) differ from the pipeline and were NOT touched:`);
    for (const conflict of result.conflicts) console.log(`  - ${conflict}`);
    console.log('Review the conflicts, then rerun with --update only if the changes should be replaced.');
    process.exitCode = 2;
  } else if (!dryRun) {
    console.log('Local install complete. Pipeline files are excluded from normal Git staging.');
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
