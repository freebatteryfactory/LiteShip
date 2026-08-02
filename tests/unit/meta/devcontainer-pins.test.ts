/** check/devcontainer-pins — live parity plus an executed planted-red fixture. */
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  deriveRustCrateCensus,
  validateDevcontainerPins,
  type DevcontainerPinInputs,
} from '../../../scripts/lib/devcontainer-pins.js';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');
const pkg = JSON.parse(read('package.json')) as { packageManager: string; engines: { node: string } };

const live: DevcontainerPinInputs = {
  packageManager: pkg.packageManager,
  nodeEngine: pkg.engines.node,
  nvmrc: read('.nvmrc').trim(),
  rustToolchain: read('rust-toolchain.toml'),
  dockerfile: read('.devcontainer/Dockerfile'),
  devcontainerJson: read('.devcontainer/devcontainer.json'),
  postCreate: read('.devcontainer/post-create.sh'),
  ciWorkflow: read('.github/workflows/ci.yml'),
  releaseWorkflow: read('.github/workflows/release.yml'),
};

const COMPLETE_TOOLCHAIN = `[toolchain]
channel = "1.85.1"
profile = "minimal"
targets = ["wasm32-unknown-unknown"]
components = ["rustfmt", "clippy"]
`;

const COMPLETE_DOCKER = `
FROM node:22.13.0-bookworm
RUN corepack prepare pnpm@10.32.1
COPY rust-toolchain.toml /opt/liteship/rust-toolchain.toml
RUN RUST_TOOLCHAIN="$(sed -n toolchain /opt/liteship/rust-toolchain.toml)" \\
 && rustup --default-toolchain "$RUST_TOOLCHAIN" --target wasm32-unknown-unknown --component rustfmt --component clippy
`;

const action = (components = 'rustfmt, clippy'): string => `
      - uses: dtolnay/rust-toolchain@3c5f7ea28cd621ae0bf5283f0e981fb97b8a7af9
        with:
          toolchain: 1.85.1
          targets: wasm32-unknown-unknown
${components === '' ? '' : `          components: ${components}\n`}`;

function writeCrate(
  root: string,
  input: {
    readonly directory: string;
    readonly name: string;
    readonly dependency: string;
    readonly feature: string;
    readonly defaultFeature?: boolean;
  },
): void {
  const crateRoot = resolve(root, 'crates', input.directory);
  mkdirSync(crateRoot, { recursive: true });
  writeFileSync(
    resolve(crateRoot, 'Cargo.toml'),
    `[package]\nname = "${input.name}"\nversion = "0.1.0"\n\n[dependencies]\n${input.dependency} = "1"\n\n[features]\ndefault = [${input.defaultFeature === true ? `"${input.feature}"` : ''}]\n${input.feature} = []\n`,
    'utf8',
  );
  writeFileSync(
    resolve(crateRoot, 'Cargo.lock'),
    `version = 4\n\n[[package]]\nname = "${input.name}"\nversion = "0.1.0"\ndependencies = [\n "${input.dependency}",\n]\n\n[[package]]\nname = "${input.dependency}"\nversion = "1.2.3"\n`,
    'utf8',
  );
}

describe('check/devcontainer-pins', () => {
  it('independently derives the live manifest, lock, dependency, and feature census', () => {
    expect(deriveRustCrateCensus(ROOT)).toEqual([
      {
        manifestPath: 'crates/liteship-compute/Cargo.toml',
        lockPath: 'crates/liteship-compute/Cargo.lock',
        packageName: 'liteship-compute',
        dependencies: [{ table: 'dependencies', name: 'libm', requirement: '0.2', lockedVersions: ['0.2.16'] }],
        defaultFeatures: [],
        optionalFeatures: [{ name: 'simd', members: [] }],
      },
    ]);
  });

  it('discovers a hidden second crate and its feature without an authored subject list', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'liteship-rust-census-'));
    try {
      writeCrate(root, { directory: 'alpha', name: 'alpha', dependency: 'alpha-dep', feature: 'simd' });
      writeCrate(root, {
        directory: 'hidden',
        name: 'hidden',
        dependency: 'hidden-dep',
        feature: 'new-feature',
        defaultFeature: true,
      });
      expect(
        deriveRustCrateCensus(root).map((crate) => [
          crate.packageName,
          crate.dependencies.map((dependency) => dependency.name),
          crate.defaultFeatures,
          crate.optionalFeatures,
        ]),
      ).toEqual([
        ['alpha', ['alpha-dep'], [], [{ name: 'simd', members: [] }]],
        ['hidden', ['hidden-dep'], ['new-feature'], [{ name: 'new-feature', members: [] }]],
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('censuses normal, development, build, and target-specific dependency tables', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'liteship-rust-census-'));
    try {
      writeCrate(root, { directory: 'scoped', name: 'scoped', dependency: 'normal-dep', feature: 'simd' });
      const crateRoot = resolve(root, 'crates', 'scoped');
      writeFileSync(
        resolve(crateRoot, 'Cargo.toml'),
        `${readFileSync(resolve(crateRoot, 'Cargo.toml'), 'utf8')}\n[dev-dependencies]\ndev-dep = "2"\n\n[build-dependencies]\nbuild-dep = "3"\n\n[target.'cfg(windows)'.dependencies]\nwindows-dep = "4"\n`,
        'utf8',
      );
      writeFileSync(
        resolve(crateRoot, 'Cargo.lock'),
        `${readFileSync(resolve(crateRoot, 'Cargo.lock'), 'utf8')}\n[[package]]\nname = "dev-dep"\nversion = "2.0.0"\n\n[[package]]\nname = "build-dep"\nversion = "3.0.0"\n\n[[package]]\nname = "windows-dep"\nversion = "4.0.0"\n`,
        'utf8',
      );
      expect(
        deriveRustCrateCensus(root)[0]!.dependencies.map((dependency) => [dependency.name, dependency.table]),
      ).toEqual([
        ['build-dep', 'build-dependencies'],
        ['dev-dep', 'dev-dependencies'],
        ['normal-dep', 'dependencies'],
        ['windows-dep', "target.'cfg(windows)'.dependencies"],
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails closed on a dependency-specific TOML table instead of omitting it', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'liteship-rust-census-'));
    try {
      writeCrate(root, { directory: 'sectioned', name: 'sectioned', dependency: 'normal-dep', feature: 'simd' });
      const manifestPath = resolve(root, 'crates', 'sectioned', 'Cargo.toml');
      writeFileSync(
        manifestPath,
        `${readFileSync(manifestPath, 'utf8')}\n[dependencies.sectioned-dep]\nversion = "1"\n`,
        'utf8',
      );
      expect(() => deriveRustCrateCensus(root)).toThrow(
        'crates/sectioned/Cargo.toml has unsupported dependency table dependencies.sectioned-dep',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails closed when an independently-discovered manifest has no adjacent lock', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'liteship-rust-census-'));
    try {
      const crateRoot = resolve(root, 'crates', 'unlocked');
      mkdirSync(crateRoot, { recursive: true });
      writeFileSync(
        resolve(crateRoot, 'Cargo.toml'),
        '[package]\nname = "unlocked"\nversion = "0.1.0"\n\n[dependencies]\n\n[features]\ndefault = []\n',
        'utf8',
      );
      expect(() => deriveRustCrateCensus(root)).toThrow('crates/unlocked/Cargo.toml has no adjacent Cargo.lock');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('the committed environment satisfies the shared pin authority', () => {
    expect(validateDevcontainerPins(live)).toEqual([]);
  });

  it('rejects one missing component and one drifting workflow action block independently', () => {
    const driftingAction = action('')
      .replace('toolchain: 1.85.1', 'toolchain: 1.86.0')
      .replace('targets: wasm32-unknown-unknown', 'targets: wasm32-wasip1');
    const failures = validateDevcontainerPins({
      ...live,
      rustToolchain: COMPLETE_TOOLCHAIN,
      dockerfile: COMPLETE_DOCKER,
      ciWorkflow: `jobs:\n  first:\n    steps:${action()}  second:\n    steps:${driftingAction}`,
      releaseWorkflow: `jobs:\n  release:\n    steps:${action('clippy, wrongfmt')}`,
    });
    expect(failures).toContain('CI Rust action setup 2 toolchain must equal rust-toolchain.toml (1.85.1)');
    expect(failures).toContain('CI Rust action setup 2 targets must equal wasm32-unknown-unknown');
    expect(failures).toContain('CI Rust action setup 2 components must equal clippy, rustfmt');
    expect(failures).toContain('release Rust action setup 1 components must equal clippy, rustfmt');
  });

  it('admits simple quoted Rust scalars and ignores nested decoys', () => {
    const quoted = `jobs:
  rust:
    steps:
      - name: setup
        uses: 'dtolnay/rust-toolchain@3c5f7ea28cd621ae0bf5283f0e981fb97b8a7af9'
        env:
          uses: dtolnay/rust-toolchain@decoy
          components: wrongfmt
        with:
          toolchain: "1.85.1"
          targets: 'wasm32-unknown-unknown'
          components: "rustfmt, clippy"
`;
    expect(
      validateDevcontainerPins({
        ...live,
        rustToolchain: COMPLETE_TOOLCHAIN,
        dockerfile: COMPLETE_DOCKER,
        ciWorkflow: quoted,
        releaseWorkflow: quoted,
      }),
    ).toEqual([]);
  });

  it('fails closed when an action use is not a classifiable direct scalar', () => {
    const unclassified = `jobs:
  rust:
    steps:
      - uses: >-
          dtolnay/rust-toolchain@3c5f7ea28cd621ae0bf5283f0e981fb97b8a7af9
        with:
          toolchain: 1.85.1
          targets: wasm32-unknown-unknown
          components: rustfmt, clippy
`;
    expect(
      validateDevcontainerPins({
        ...live,
        rustToolchain: COMPLETE_TOOLCHAIN,
        dockerfile: COMPLETE_DOCKER,
        ciWorkflow: unclassified,
        releaseWorkflow: `jobs:\n  release:\n    steps:${action()}`,
      }),
    ).toContain('CI workflow is unreadable: rust: uses is not a simple YAML scalar');
  });

  it('the same authority rejects floating and mismatched toolchains', () => {
    const failures = validateDevcontainerPins({
      ...live,
      rustToolchain: '[toolchain]\nchannel = "stable"\nprofile = "default"\ntargets = []\n',
      dockerfile: 'FROM node:22-bookworm\nRUN rustup toolchain install stable\nRUN corepack prepare pnpm@latest',
      postCreate: 'corepack prepare pnpm@latest',
      ciWorkflow: 'uses: dtolnay/rust-toolchain@stable\n  with:\n    toolchain: stable',
      releaseWorkflow: 'uses: dtolnay/rust-toolchain@stable\n  with:\n    toolchain: stable',
    });
    expect(failures).toContain('Dockerfile must use a fully pinned node:X.Y.Z image');
    expect(failures).toContain('Dockerfile pnpm pin must match package.json');
    expect(failures).toContain('post-create pnpm pin must match package.json');
    expect(failures).toContain('rust-toolchain.toml must pin an exact X.Y.Z channel');
    expect(failures).toContain('rust-toolchain.toml targets must equal wasm32-unknown-unknown');
    expect(failures).toContain('rust-toolchain.toml components must equal clippy, rustfmt');
    expect(failures).toContain('Dockerfile must COPY the repository rust-toolchain.toml');
    expect(failures).toContain('Dockerfile must install the exact channel read from rust-toolchain.toml');
    expect(failures).toContain('Dockerfile Rust setup targets must equal wasm32-unknown-unknown');
    expect(failures).toContain('Dockerfile Rust setup components must equal clippy, rustfmt');
    expect(failures).toContain('CI must carry a SHA-pinned Rust toolchain action');
    expect(failures).toContain('release must carry a SHA-pinned Rust toolchain action');
  });
});
