/** Derived, pinned Clippy and WASM build qualification arms. @module */

import { deriveRustCrateCensus, deriveRustToolchainChannel, deriveRustToolchainTargets } from './devcontainer-pins.js';

export type RustWasmQualificationKind = 'host-clippy' | 'wasm-default' | 'wasm-feature';

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
    arms.push(
      Object.freeze({
        id: `${crate.packageName}/host-clippy`,
        kind: 'host-clippy',
        manifestPath: crate.manifestPath,
        command: 'rustup',
        argv: pinnedCargoArgv(channel, [
          'clippy',
          '--manifest-path',
          crate.manifestPath,
          '--locked',
          '--all-targets',
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
