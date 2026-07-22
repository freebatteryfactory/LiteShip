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
  dockerfile: read('.devcontainer/Dockerfile'),
  devcontainerJson: read('.devcontainer/devcontainer.json'),
  postCreate: read('.devcontainer/post-create.sh'),
  ciWorkflow: read('.github/workflows/ci.yml'),
};

describe('check/devcontainer-pins', () => {
  it('the committed environment satisfies the shared pin authority', () => {
    expect(validateDevcontainerPins(live)).toEqual([]);
  });

  it('the same authority rejects floating and mismatched toolchains', () => {
    const failures = validateDevcontainerPins({
      ...live,
      dockerfile: 'FROM node:22-bookworm\nRUN rustup toolchain install stable\nRUN corepack prepare pnpm@latest',
      postCreate: 'corepack prepare pnpm@latest',
    });
    expect(failures).toContain('Dockerfile must use a fully pinned node:X.Y.Z image');
    expect(failures).toContain('Dockerfile pnpm pin must match package.json');
    expect(failures).toContain('post-create pnpm pin must match package.json');
    expect(failures).toContain('Rust-installing Dockerfile must reference the repository Rust toolchain pin');
  });
});
