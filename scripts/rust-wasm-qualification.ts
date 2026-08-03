/** Execute repository-pinned host Clippy and derived WASM feature builds. @module */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnArgvVisibleWithEnv } from '../packages/command/src/host/launcher.js';
import { deriveRustWasmQualificationArms } from './lib/rust-wasm-qualification.js';

const repoRoot = resolve(import.meta.dirname, '..');
if (process.argv.length !== 2) {
  console.error('usage: pnpm exec tsx scripts/rust-wasm-qualification.ts');
  process.exit(2);
}

const toolchain = readFileSync(resolve(repoRoot, 'rust-toolchain.toml'), 'utf8');
const arms = deriveRustWasmQualificationArms(repoRoot, toolchain);
for (const arm of arms) {
  console.log(`[rust-wasm] ${arm.id}`);
  const result = await spawnArgvVisibleWithEnv(arm.command, arm.argv, {
    cwd: repoRoot,
    envAdditions: arm.envAdditions,
  });
  if (result.exitCode !== 0) process.exit(result.exitCode);
}
console.log(`[rust-wasm] PASS: ${arms.length} derived qualification arms`);
