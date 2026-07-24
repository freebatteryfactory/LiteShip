/**
 * Build the liteship-compute WASM kernel from Rust source and stage it inside
 * `@liteship/core`'s publish surface so the artifact ships with the package.
 *
 * Why this exists: `WASMDispatch` (the escape hatch) has always been able to
 * `load()` a `.wasm`, but no published package CARRIED one — so an installed
 * consumer had nothing to load and silently ran the f32 TS fallback forever
 * (the heyoub.dev dogfood finding, 0.2.1). The `@liteship/vite` resolver now looks
 * for `@liteship/core/liteship-compute.wasm` in `node_modules`; this script is what
 * puts the binary there.
 *
 * Build-truth doctrine (cf. the `rust-wasm-parity` CI job): the artifact is
 * ALWAYS rebuilt from `crates/liteship-compute` — nothing prebuilt is trusted, and
 * the binary is never committed (it lands in the gitignored `dist/`). Run this
 * after `pnpm run build` (so `dist/` exists) and before any `pnpm publish` /
 * `liteship ship`. CI and `release.yml` both invoke it; the parity suite rebuilds
 * the crate independently.
 *
 * @module
 */

import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { bearingGlyph, color, header } from '../packages/cli/src/lib/ansi.js';
import { spawnArgv } from './lib/spawn.js';

const repoRoot = resolve(import.meta.dirname, '..');
const crateDir = resolve(repoRoot, 'crates/liteship-compute');
const crateArtifact = resolve(
  crateDir,
  'target/wasm32-unknown-unknown/release/liteship_compute.wasm',
);
// The published filename uses the hyphenated package-facing name
// (`liteship-compute.wasm`), not the crate's underscored cdylib output. The
// `@liteship/vite` resolver and the `@liteship/core` export subpath both reference
// this name.
const shipped = resolve(repoRoot, 'packages/core/dist/liteship-compute.wasm');

async function run(): Promise<void> {
  process.stderr.write(header('build:wasm — liteship-compute → @liteship/core') + '\n');

  // 1. Rebuild from source (build-truth: never trust a prebuilt artifact).
  //    `-D warnings` mirrors the rust-wasm-parity CI job so a warning here
  //    fails the same way it would in CI rather than shipping a soft binary.
  //    SpawnArgvOpts carries no env field; the child inherits process.env, so
  //    set RUSTFLAGS there.
  process.env['RUSTFLAGS'] = '-D warnings';
  const result = await spawnArgv(
    'cargo',
    ['build', '--release', '--target', 'wasm32-unknown-unknown', '--manifest-path', resolve(crateDir, 'Cargo.toml')],
    { stdio: 'inherit', cwd: repoRoot },
  );
  if (result.exitCode !== 0) {
    process.stderr.write(`${bearingGlyph('fail')} cargo build failed (exit ${result.exitCode}).\n`);
    process.exit(result.exitCode);
  }

  // 2. Stage into @liteship/core's dist (gitignored build output, included in the
  //    package `files` allowlist → ships in the tarball at pack time).
  mkdirSync(resolve(repoRoot, 'packages/core/dist'), { recursive: true });
  copyFileSync(crateArtifact, shipped);

  const bytes = statSync(shipped).size;
  process.stderr.write(
    `${bearingGlyph('ok')} ${color('green', 'staged')} packages/core/dist/liteship-compute.wasm ` +
      `(${(bytes / 1024).toFixed(1)} KB)\n`,
  );
}

await run();
