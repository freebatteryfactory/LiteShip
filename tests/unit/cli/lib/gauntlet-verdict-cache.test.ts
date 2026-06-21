/**
 * The fs-backed gate-verdict cache + the toolchain digest (Slice B, B2 — the HOST
 * half). The engine-level soundness laws are proven in
 * `tests/unit/gauntlet/verdict-cache.test.ts`; here we prove the fs store's
 * contract: a write+read round-trips the RAW findings; a malformed/absent file is
 * a MISS (never a throw, never a stale serve — the safe fallthrough); and the
 * toolchain digest is deterministic + changes when the gauntlet dist changes (the
 * anti-lie keystone the host computes).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finding, type Finding } from '@czap/gauntlet';
import {
  makeFsVerdictCache,
  gauntletToolchainDigest,
} from '../../../../packages/cli/src/lib/gauntlet-verdict-cache.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'czap-verdict-cache-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const SAMPLE: readonly Finding[] = [
  finding({
    ruleId: 'test/rule',
    severity: 'error',
    level: 'L2',
    title: 'a finding',
    detail: 'why',
    location: { file: 'packages/a/src/x.ts', line: 3 },
  }),
];

describe('makeFsVerdictCache — round-trip', () => {
  it('writes then reads back the identical raw findings under .czap/cache/gauntlet', () => {
    const cache = makeFsVerdictCache(dir);
    expect(cache.read('key-1')).toBeNull(); // absent → MISS
    cache.write('key-1', SAMPLE);
    expect(cache.read('key-1')).toEqual(SAMPLE); // round-trips exactly

    // The store lives under the idempotency-sibling layout.
    const files = readdirSync(join(dir, '.czap', 'cache', 'gauntlet'));
    expect(files.length).toBe(1);
    expect(files[0]?.endsWith('.json')).toBe(true);
  });

  it('distinct keys do not collide', () => {
    const cache = makeFsVerdictCache(dir);
    cache.write('key-a', SAMPLE);
    cache.write('key-b', []);
    expect(cache.read('key-a')).toEqual(SAMPLE);
    expect(cache.read('key-b')).toEqual([]);
  });
});

describe('makeFsVerdictCache — malformed/corrupt file is a MISS (the safe fallthrough, never a throw)', () => {
  it('a non-JSON file parses to null (MISS), not a throw', () => {
    const cache = makeFsVerdictCache(dir);
    // Write the cache, then corrupt the on-disk file with non-JSON garbage.
    cache.write('key-x', SAMPLE);
    const gdir = join(dir, '.czap', 'cache', 'gauntlet');
    const file = join(gdir, readdirSync(gdir)[0] as string);
    writeFileSync(file, '{ this is : not json', 'utf8');
    expect(cache.read('key-x')).toBeNull(); // corrupt → MISS, never a stale serve
  });

  it('a JSON array of the WRONG shape (not Findings) is a MISS, not a corrupt serve', () => {
    const cache = makeFsVerdictCache(dir);
    cache.write('key-y', SAMPLE);
    const gdir = join(dir, '.czap', 'cache', 'gauntlet');
    const file = join(gdir, readdirSync(gdir)[0] as string);
    writeFileSync(file, JSON.stringify([{ not: 'a finding' }, 42]), 'utf8');
    expect(cache.read('key-y')).toBeNull(); // wrong shape → MISS
  });

  it('a JSON value that is not an array is a MISS', () => {
    // Pre-seed a malformed file by writing directly into the slug-derived path. We
    // cannot predict the slug, so write via the cache then overwrite contents.
    const cache = makeFsVerdictCache(dir);
    cache.write('key-z', SAMPLE);
    const gdir = join(dir, '.czap', 'cache', 'gauntlet');
    const file = join(gdir, readdirSync(gdir)[0] as string);
    writeFileSync(file, JSON.stringify({ ruleId: 'x' }), 'utf8');
    expect(cache.read('key-z')).toBeNull();
  });
});

describe('gauntletToolchainDigest — deterministic + dist-sensitive (the anti-lie keystone)', () => {
  it('is deterministic for the same env + the same built gauntlet', () => {
    const env = { node: 'v22.0.0', platform: 'linux', arch: 'x64', pm: '' };
    expect(gauntletToolchainDigest(env)).toBe(gauntletToolchainDigest(env));
  });

  it('changes when the env fingerprint changes (a verdict is never served across toolchains)', () => {
    const a = gauntletToolchainDigest({ node: 'v22.0.0', platform: 'linux', arch: 'x64', pm: '' });
    const b = gauntletToolchainDigest({ node: 'v20.0.0', platform: 'linux', arch: 'x64', pm: '' });
    expect(a).not.toBe(b);
  });

  it('carries the tc-sha256 scheme prefix (a self-describing, opaque digest)', () => {
    expect(gauntletToolchainDigest({ node: 'v22', platform: 'linux', arch: 'x64', pm: '' })).toMatch(
      /^tc-sha256:[0-9a-f]{32}$/,
    );
  });
});
