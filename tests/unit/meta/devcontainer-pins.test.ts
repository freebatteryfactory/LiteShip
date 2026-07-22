/** check/devcontainer-pins — live parity plus an executed planted-red fixture. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDevcontainerPins, type DevcontainerPinInputs } from '../../../scripts/lib/devcontainer-pins.js';

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

describe('check/devcontainer-pins', () => {
  it('the committed environment satisfies the shared pin authority', () => {
    expect(validateDevcontainerPins(live)).toEqual([]);
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
    expect(failures).toContain('Dockerfile must COPY the repository rust-toolchain.toml');
    expect(failures).toContain('Dockerfile must install the exact channel read from rust-toolchain.toml');
    expect(failures).toContain('CI must carry a SHA-pinned Rust toolchain action');
    expect(failures).toContain('release must carry a SHA-pinned Rust toolchain action');
  });
});
