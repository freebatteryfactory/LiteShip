import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveRustWasmQualificationArms } from '../../../scripts/lib/rust-wasm-qualification.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const TOOLCHAIN = `[toolchain]
channel = "9.8.7"
targets = ["wasm32-unknown-unknown"]
components = ["rustfmt", "clippy"]
`;

function writeCrate(root: string, directory: string, name: string, features: readonly string[]): void {
  const crateRoot = resolve(root, 'crates', directory);
  mkdirSync(resolve(crateRoot, 'src'), { recursive: true });
  writeFileSync(
    resolve(crateRoot, 'Cargo.toml'),
    `[package]\nname = "${name}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n\n[features]\ndefault = []\n${features.map((feature) => `${feature} = []`).join('\n')}\n`,
    'utf8',
  );
  writeFileSync(
    resolve(crateRoot, 'Cargo.lock'),
    `version = 4\n\n[[package]]\nname = "${name}"\nversion = "0.1.0"\n`,
    'utf8',
  );
  writeFileSync(resolve(crateRoot, 'src', 'lib.rs'), '#![no_std]\n', 'utf8');
}

describe('check/rust-wasm-qualification derived arms', () => {
  it('pins the live crate to per-target Clippy plus default and SIMD WASM builds', () => {
    const source = readFileSync(resolve(ROOT, 'rust-toolchain.toml'), 'utf8');
    const arms = deriveRustWasmQualificationArms(ROOT, source);
    expect(arms.map((arm) => arm.id)).toEqual([
      'liteship-compute/wasm32-unknown-unknown/clippy',
      'liteship-compute/host-test-clippy',
      'liteship-compute/wasm32-unknown-unknown/default',
      'liteship-compute/wasm32-unknown-unknown/feature:simd',
    ]);
    expect(arms.every((arm) => arm.command === 'rustup' && arm.argv.slice(0, 3).join(' ') === 'run 1.85.1 cargo')).toBe(
      true,
    );

    // THE TARGET LAW: no Clippy arm may sweep `--all-targets`. A `no_std` wasm
    // `cdylib` cannot compile its lib target for the host at all, so such a
    // sweep reports the wrong target's errors rather than the crate's defects.
    expect(
      arms.filter((arm) => arm.argv.includes('clippy') && arm.argv.includes('--all-targets')),
      'a Clippy arm swept --all-targets; check the library per wasm target and the tests on the host instead',
    ).toEqual([]);

    // The library is checked where it actually compiles…
    expect(arms.find((arm) => arm.kind === 'wasm-clippy')?.argv).toEqual([
      'run',
      '1.85.1',
      'cargo',
      'clippy',
      '--manifest-path',
      'crates/liteship-compute/Cargo.toml',
      '--locked',
      '--target',
      'wasm32-unknown-unknown',
      '--lib',
      '--all-features',
      '--',
      '-D',
      'warnings',
    ]);
    // …and the std-linked test target where it actually runs.
    expect(arms.find((arm) => arm.kind === 'host-test-clippy')?.argv).toEqual([
      'run',
      '1.85.1',
      'cargo',
      'clippy',
      '--manifest-path',
      'crates/liteship-compute/Cargo.toml',
      '--locked',
      '--tests',
      '--all-features',
      '--',
      '-D',
      'warnings',
    ]);
    expect(arms.find((arm) => arm.feature === 'simd')?.argv).toEqual([
      'run',
      '1.85.1',
      'cargo',
      'build',
      '--manifest-path',
      'crates/liteship-compute/Cargo.toml',
      '--locked',
      '--release',
      '--target',
      'wasm32-unknown-unknown',
      '--no-default-features',
      '--features',
      'simd',
    ]);
  });

  it('discovers a hidden crate and every optional feature without an authored crate or feature list', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'liteship-rust-wasm-'));
    try {
      writeCrate(root, 'alpha', 'alpha', ['simd']);
      writeCrate(root, 'hidden', 'hidden', ['fast', 'wide']);
      expect(deriveRustWasmQualificationArms(root, TOOLCHAIN).map((arm) => arm.id)).toEqual([
        'alpha/wasm32-unknown-unknown/clippy',
        'alpha/host-test-clippy',
        'alpha/wasm32-unknown-unknown/default',
        'alpha/wasm32-unknown-unknown/feature:simd',
        'hidden/wasm32-unknown-unknown/clippy',
        'hidden/host-test-clippy',
        'hidden/wasm32-unknown-unknown/default',
        'hidden/wasm32-unknown-unknown/feature:fast',
        'hidden/wasm32-unknown-unknown/feature:wide',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails closed when the optional-feature projection or WASM target projection is empty', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'liteship-rust-wasm-empty-'));
    try {
      writeCrate(root, 'plain', 'plain', []);
      expect(() => deriveRustWasmQualificationArms(root, TOOLCHAIN)).toThrow('zero optional feature arms');
      expect(() =>
        deriveRustWasmQualificationArms(
          root,
          TOOLCHAIN.replace('targets = ["wasm32-unknown-unknown"]', 'targets = ["x86_64-unknown-linux-gnu"]'),
        ),
      ).toThrow('zero wasm32 toolchain targets');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
