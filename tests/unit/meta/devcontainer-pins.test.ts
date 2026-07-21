/**
 * check/devcontainer-pins — the .devcontainer pins are STATIC parity assertions
 * against the repo source-of-truth versions (P16). The container is never booted
 * here (the sandbox cannot); this test proves the committed pins can't silently
 * drift away from `package.json` (engines / packageManager), `.nvmrc`, and the CI
 * toolchain pin.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');

const pkg = JSON.parse(read('package.json')) as {
  packageManager: string;
  engines: { node: string };
};
const dockerfile = read('.devcontainer/Dockerfile');
const devcontainerJson = read('.devcontainer/devcontainer.json');
const postCreate = read('.devcontainer/post-create.sh');
const nvmrc = read('.nvmrc').trim();
const ci = read('.github/workflows/ci.yml');

/** Compare two numeric `[major, minor, patch]` triples: -1 / 0 / 1. */
function cmp(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0) ? -1 : 1;
  }
  return 0;
}

describe('check/devcontainer-pins — container pins == repo source-of-truth', () => {
  it('the base image is a fully-pinned node:X.Y.Z build (no floating devcontainers tag)', () => {
    // devcontainer.json builds from the Dockerfile — it must NOT carry a floating `image`.
    expect(devcontainerJson).toContain('"build"');
    expect(devcontainerJson).not.toMatch(/"image"\s*:/);
    expect(/FROM node:\d+\.\d+\.\d+-/.exec(dockerfile), 'Dockerfile must FROM a pinned node:X.Y.Z tag').not.toBeNull();
  });

  it('the pinned node major matches .nvmrc and the version satisfies package.json engines.node', () => {
    const m = /FROM node:(\d+)\.(\d+)\.(\d+)-/.exec(dockerfile)!;
    const [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])];
    expect(String(maj), 'Dockerfile node major must equal .nvmrc').toBe(nvmrc);

    const floor = pkg.engines.node.replace(/^>=?/, '').split('.').map(Number);
    expect(
      cmp([maj, min, pat], floor),
      `node ${maj}.${min}.${pat} must satisfy engines.node ${pkg.engines.node}`,
    ).toBeGreaterThanOrEqual(0);
  });

  it('the pnpm pin equals package.json packageManager (in both the Dockerfile and post-create)', () => {
    const version = pkg.packageManager.split('@')[1];
    expect(version, 'package.json packageManager must be pnpm@X.Y.Z').toMatch(/^\d+\.\d+\.\d+$/);
    expect(dockerfile, 'Dockerfile must pin the same pnpm').toContain(`pnpm@${version}`);
    expect(postCreate, 'post-create.sh must pin the same pnpm').toContain(`pnpm@${version}`);
  });

  it('if the container references a rust toolchain, it matches the CI rust pin', () => {
    const ciSha = /dtolnay\/rust-toolchain@([0-9a-f]{40})/.exec(ci)?.[1];
    expect(ciSha, 'CI must carry a SHA-pinned dtolnay/rust-toolchain').toBeDefined();
    if (/rust|rustup|cargo|dtolnay/i.test(dockerfile)) {
      expect(dockerfile, 'a rust-installing container must reuse the CI rust pin').toContain(ciSha!);
    } else {
      // The container does not install rust (the wasm build is optional) — nothing to pin.
      expect(true).toBe(true);
    }
  });
});
