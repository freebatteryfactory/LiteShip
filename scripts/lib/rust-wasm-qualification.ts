/** Derived, pinned Clippy and WASM build qualification arms. @module */

import { deriveRustCrateCensus, deriveRustToolchainChannel, deriveRustToolchainTargets } from './devcontainer-pins.js';

export type RustWasmQualificationKind = 'wasm-clippy' | 'host-test-clippy' | 'wasm-default' | 'wasm-feature';

export interface RustWasmQualificationArm {
  readonly id: string;
  readonly kind: RustWasmQualificationKind;
  readonly manifestPath: string;
  readonly target?: string;
  readonly feature?: string;
  readonly command: 'rustup';
  readonly argv: readonly string[];
  readonly envAdditions: Readonly<{ RUSTFLAGS: '-D warnings' }>;
}

const DENY_WARNINGS_ENV = Object.freeze({ RUSTFLAGS: '-D warnings' as const });

function pinnedCargoArgv(channel: string, args: readonly string[]): readonly string[] {
  return Object.freeze(['run', channel, 'cargo', ...args]);
}

/**
 * Derive every qualification arm from crates/* plus rust-toolchain.toml.
 * Each crate gets host Clippy, every committed WASM target gets a default build,
 * and every optional Cargo feature gets an isolated WASM build. Empty feature
 * or WASM-target projections fail closed so the SIMD lane cannot vanish.
 */
export function deriveRustWasmQualificationArms(
  repoRoot: string,
  rustToolchainSource: string,
): readonly RustWasmQualificationArm[] {
  const channel = deriveRustToolchainChannel(rustToolchainSource);
  const wasmTargets = deriveRustToolchainTargets(rustToolchainSource).filter((target) => target.startsWith('wasm32-'));
  if (wasmTargets.length === 0) throw new TypeError('Rust qualification discovered zero wasm32 toolchain targets');

  const crates = deriveRustCrateCensus(repoRoot);
  const optionalFeatureCount = crates.reduce((count, crate) => count + crate.optionalFeatures.length, 0);
  if (optionalFeatureCount === 0) {
    throw new TypeError('Rust qualification discovered zero optional feature arms');
  }

  const arms: RustWasmQualificationArm[] = [];
  for (const crate of crates) {
    // Clippy runs PER TARGET, never as one `--all-targets` host sweep.
    //
    // These crates are `no_std` wasm `cdylib`s. A host `--all-targets` sweep
    // builds the LIB target for the host, where the crate cannot compile at
    // all: the panic handler calls `core::arch::wasm32::unreachable` (absent
    // off-target) and a `cdylib` needs a panic handler the host's unwinding
    // strategy rejects. The first run of that sweep reported three such
    // errors — none of them a defect in the crate, all of them artifacts of
    // checking wasm-only code on the wrong target.
    //
    // Splitting the sweep loses no lint coverage: the library lints are
    // target-independent, so the wasm arm still reports them (proved by
    // reintroducing a `needless_range_loop` and watching this arm red). The
    // test target is the mirror case — it is `cfg(test)`, links std, and only
    // ever runs on the host — so it is checked there and nowhere else.
    for (const target of wasmTargets) {
      arms.push(
        Object.freeze({
          id: `${crate.packageName}/${target}/clippy`,
          kind: 'wasm-clippy',
          manifestPath: crate.manifestPath,
          target,
          command: 'rustup',
          argv: pinnedCargoArgv(channel, [
            'clippy',
            '--manifest-path',
            crate.manifestPath,
            '--locked',
            '--target',
            target,
            '--lib',
            '--all-features',
            '--',
            '-D',
            'warnings',
          ]),
          envAdditions: DENY_WARNINGS_ENV,
        }),
      );
    }
    arms.push(
      Object.freeze({
        id: `${crate.packageName}/host-test-clippy`,
        kind: 'host-test-clippy',
        manifestPath: crate.manifestPath,
        command: 'rustup',
        argv: pinnedCargoArgv(channel, [
          'clippy',
          '--manifest-path',
          crate.manifestPath,
          '--locked',
          '--tests',
          '--all-features',
          '--',
          '-D',
          'warnings',
        ]),
        envAdditions: DENY_WARNINGS_ENV,
      }),
    );
    for (const target of wasmTargets) {
      arms.push(
        Object.freeze({
          id: `${crate.packageName}/${target}/default`,
          kind: 'wasm-default',
          manifestPath: crate.manifestPath,
          target,
          command: 'rustup',
          argv: pinnedCargoArgv(channel, [
            'build',
            '--manifest-path',
            crate.manifestPath,
            '--locked',
            '--release',
            '--target',
            target,
          ]),
          envAdditions: DENY_WARNINGS_ENV,
        }),
      );
      for (const feature of crate.optionalFeatures) {
        arms.push(
          Object.freeze({
            id: `${crate.packageName}/${target}/feature:${feature.name}`,
            kind: 'wasm-feature',
            manifestPath: crate.manifestPath,
            target,
            feature: feature.name,
            command: 'rustup',
            argv: pinnedCargoArgv(channel, [
              'build',
              '--manifest-path',
              crate.manifestPath,
              '--locked',
              '--release',
              '--target',
              target,
              '--no-default-features',
              '--features',
              feature.name,
            ]),
            envAdditions: DENY_WARNINGS_ENV,
          }),
        );
      }
    }
  }
  return Object.freeze(arms);
}
