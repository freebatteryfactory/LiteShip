/** Execute repository-pinned rustfmt over the derived all-crate/all-Rust census. @module */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnArgvVisibleWithEnv } from '../packages/command/src/host/launcher.js';
import { deriveRustfmtSubjects, pinnedRustfmtInvocation } from './lib/rustfmt-contract.js';

const repoRoot = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const write = args.length === 1 && args[0] === '--write';
if (args.length > (write ? 1 : 0)) {
  console.error('usage: pnpm exec tsx scripts/rustfmt-check.ts [--write]');
  process.exit(2);
}

async function main(): Promise<void> {
  const subjects = deriveRustfmtSubjects(repoRoot);
  const rustToolchainSource = readFileSync(resolve(repoRoot, 'rust-toolchain.toml'), 'utf8');
  for (const subject of subjects) {
    console.log(
      `[rustfmt] ${write ? 'format' : 'check'} ${subject.manifestPath} (${subject.sourcePaths.length} Rust files, edition ${subject.edition})`,
    );
    const invocation = pinnedRustfmtInvocation(rustToolchainSource, subject, !write);
    const result = await spawnArgvVisibleWithEnv(invocation.command, invocation.argv, { cwd: repoRoot });
    if (result.exitCode !== 0) process.exit(result.exitCode);
  }
  console.log(`[rustfmt] PASS: ${subjects.length} Cargo subjects`);
}

void main();
