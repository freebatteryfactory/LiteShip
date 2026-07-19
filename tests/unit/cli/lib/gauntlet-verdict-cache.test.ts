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
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync, statSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { hasTag } from '@liteship/error';
import {
  finding,
  gateVerdictKey,
  coverageDigestOf,
  makeRepoIR,
  MISSING_DIGEST_SENTINEL,
  type Finding,
} from '@liteship/gauntlet';
import {
  makeFsVerdictCache,
  makeFsMutantVerdictCache,
  gauntletToolchainDigest,
  toolchainDigestOf,
  TOOLCHAIN_PACKAGES,
  type ToolchainPackageSegment,
} from '../../../../packages/cli/src/lib/gauntlet-verdict-cache.js';
import { eaccesUntestableAsRoot } from '../../../helpers/capabilities.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'liteship-verdict-cache-'));
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
  it('writes then reads back the identical raw findings under .liteship/cache/gauntlet', () => {
    const cache = makeFsVerdictCache(dir);
    expect(cache.read('key-1')).toBeNull(); // absent → MISS
    cache.write('key-1', SAMPLE);
    expect(cache.read('key-1')).toEqual(SAMPLE); // round-trips exactly

    // The store lives under the idempotency-sibling layout.
    const files = readdirSync(join(dir, '.liteship', 'cache', 'gauntlet'));
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
    const gdir = join(dir, '.liteship', 'cache', 'gauntlet');
    const file = join(gdir, readdirSync(gdir)[0] as string);
    writeFileSync(file, '{ this is : not json', 'utf8');
    expect(cache.read('key-x')).toBeNull(); // corrupt → MISS, never a stale serve
  });

  it('a JSON array of the WRONG shape (not Findings) is a MISS, not a corrupt serve', () => {
    const cache = makeFsVerdictCache(dir);
    cache.write('key-y', SAMPLE);
    const gdir = join(dir, '.liteship', 'cache', 'gauntlet');
    const file = join(gdir, readdirSync(gdir)[0] as string);
    writeFileSync(file, JSON.stringify([{ not: 'a finding' }, 42]), 'utf8');
    expect(cache.read('key-y')).toBeNull(); // wrong shape → MISS
  });

  it('a JSON value that is not an array is a MISS', () => {
    // Pre-seed a malformed file by writing directly into the slug-derived path. We
    // cannot predict the slug, so write via the cache then overwrite contents.
    const cache = makeFsVerdictCache(dir);
    cache.write('key-z', SAMPLE);
    const gdir = join(dir, '.liteship', 'cache', 'gauntlet');
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

  it('folds the env fingerprint order-INDEPENDENTLY (sorted keys → same digest)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 6 }),
        fc.string({ minLength: 1, maxLength: 6 }),
        (a, b) => {
          // Two structurally-equal env maps with different insertion order key identically.
          const forward = gauntletToolchainDigest({ node: a, platform: b, arch: 'x64', pm: '' });
          const reordered = gauntletToolchainDigest({ pm: '', arch: 'x64', platform: b, node: a });
          expect(forward).toBe(reordered);
        },
      ),
    );
  });

  it('uses currentEnvFingerprint() by DEFAULT — a digest computed with no arg is well-formed', () => {
    // The default-parameter arm: no env passed → the live process fingerprint is folded.
    expect(gauntletToolchainDigest()).toMatch(/^tc-sha256:[0-9a-f]{32}$/);
  });

  it('an env entry whose value is absent folds as the empty string (the `?? \'\'` arm), still deterministic', () => {
    // A key present in Object.keys but with no own string value exercises the
    // nullish-coalesce arm of the env fold. Built with a null-proto record so the typed
    // surface stays honest (no cast) while the runtime value is genuinely undefined.
    const sparse: Record<string, string> = Object.create(null);
    sparse['node'] = 'v22';
    sparse['platform'] = 'linux';
    sparse['arch'] = 'x64';
    Object.defineProperty(sparse, 'pm', { value: undefined, enumerable: true, writable: true });
    const folded = gauntletToolchainDigest(sparse);
    const withEmpty = gauntletToolchainDigest({ node: 'v22', platform: 'linux', arch: 'x64', pm: '' });
    expect(folded).toBe(withEmpty); // undefined value === '' in the fold
  });
});

// ── TEETH (P1 #1): the toolchain digest folds EVERY fact-producing package's dist ──
//
// The "pure-IR" divergence gates fold `ir.facts`/`ir.refs` whose VALUES are computed
// by the host `liteshipRegexOracle` (@liteship/cli) + the audit LanguageService oracle
// (@liteship/audit). The PRE-FIX digest folded ONLY @liteship/gauntlet's dist, so an
// ORACLE-logic change with byte-identical source + an unchanged gauntlet dist produced
// an IDENTICAL digest → a warm cache STALE-HIT (the deeper lie). These tests build two
// fake dist trees that differ ONLY in the @liteship/cli (or @liteship/audit) segment — an
// oracle-logic edit — and assert the now-extended digest CHANGES. The `oldGauntletOnly`
// helper reproduces the PRE-FIX fold and is RED (digest IDENTICAL → stale hit) under the
// exact same edit, proving the bug existed and the fold cures it.

describe('toolchainDigest folds cli + audit (the oracle-code soundness keystone) — P1 #1', () => {
  let fakeDistRoot: string;

  beforeEach(() => {
    fakeDistRoot = mkdtempSync(join(tmpdir(), 'liteship-tc-segments-'));
  });
  afterEach(() => {
    rmSync(fakeDistRoot, { recursive: true, force: true });
  });

  const ENV = { node: 'v22', platform: 'linux', arch: 'x64', pm: '' } as const;

  let seq = 0;
  /**
   * Materialize a fake `dist` dir holding `oracle.js` with `body`, return its path. Each
   * call gets a UNIQUE directory (a monotonic suffix) so two variants of the "same"
   * package never overwrite each other on disk — the digest reads the bytes we built,
   * not whatever the last write left behind (the fold reads files eagerly, so distinct
   * BODIES must live at distinct PATHS to coexist). The repo-relative path the digest
   * folds is `oracle.js` either way (the dist-relative name, not the temp prefix), so the
   * ONLY difference the digest sees is the file BODY — exactly an oracle-logic edit.
   */
  function fakeDist(name: string, body: string): string {
    const dir = join(fakeDistRoot, `${name}-${seq++}`, 'dist');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'oracle.js'), body, 'utf8');
    return dir;
  }

  /** The three fact-producing segments, with the cli/audit oracle bodies parameterized. */
  function segments(opts: { cliOracle: string; auditOracle: string }): ToolchainPackageSegment[] {
    return [
      { label: '@liteship/audit', distDir: fakeDist('audit', opts.auditOracle), version: '0.4.0' },
      { label: '@liteship/cli', distDir: fakeDist('cli', opts.cliOracle), version: '0.4.0' },
      { label: '@liteship/gauntlet', distDir: fakeDist('gauntlet', 'export const gate = 1;\n'), version: '0.4.0' },
    ];
  }

  /**
   * The PRE-FIX fold: ONLY the @liteship/gauntlet segment (the bug). Reproduced here so the
   * RED-before is concrete — under a cli/audit oracle edit this digest does NOT change.
   */
  function oldGauntletOnly(segs: readonly ToolchainPackageSegment[]): string {
    const gauntletOnly = segs.filter((s) => s.label === '@liteship/gauntlet');
    return toolchainDigestOf(gauntletOnly, ENV);
  }

  it('the FIXED digest is IDENTICAL when every fact-producing package is byte-identical', () => {
    const a = toolchainDigestOf(segments({ cliOracle: 'A', auditOracle: 'B' }), ENV);
    const b = toolchainDigestOf(segments({ cliOracle: 'A', auditOracle: 'B' }), ENV);
    expect(a).toBe(b); // determinism preserved — the fix did not break the HIT path
    expect(a).toMatch(/^tc-sha256:[0-9a-f]{32}$/); // unchanged scheme
  });

  it('changing the @liteship/cli HOST-ORACLE dist (source + gauntlet unchanged) FLIPS the digest — no stale hit', () => {
    const before = segments({ cliOracle: 'liteshipRegexOracle@v1', auditOracle: 'lsOracle@v1' });
    const afterCliEdit = segments({ cliOracle: 'liteshipRegexOracle@v2-EDITED', auditOracle: 'lsOracle@v1' });

    // RED-before: the pre-fix gauntlet-only fold does NOT change → it would serve a
    // stale verdict for a divergence gate whose facts the edited cli oracle produced.
    expect(oldGauntletOnly(afterCliEdit)).toBe(oldGauntletOnly(before));

    // GREEN-after: the extended fold (cli + audit + gauntlet) DOES change → MISS → re-run.
    expect(toolchainDigestOf(afterCliEdit, ENV)).not.toBe(toolchainDigestOf(before, ENV));
  });

  it('changing the @liteship/audit LS-ORACLE / IR-builder dist FLIPS the digest — no stale hit', () => {
    const before = segments({ cliOracle: 'regex@v1', auditOracle: 'symbolOrphanOracle@v1' });
    const afterAuditEdit = segments({ cliOracle: 'regex@v1', auditOracle: 'symbolOrphanOracle@v2-EDITED' });

    // RED-before: the pre-fix gauntlet-only fold is blind to the audit oracle edit.
    expect(oldGauntletOnly(afterAuditEdit)).toBe(oldGauntletOnly(before));

    // GREEN-after: the extended fold catches it.
    expect(toolchainDigestOf(afterAuditEdit, ENV)).not.toBe(toolchainDigestOf(before, ENV));
  });

  it('the real gauntletToolchainDigest declares ALL THREE fact-producing packages (cli + audit + gauntlet)', () => {
    // The fix is the SET: a future refactor that drops cli or audit from the fold would
    // silently reopen the hole, so pin the membership as a law.
    expect([...TOOLCHAIN_PACKAGES].sort()).toEqual(['@liteship/audit', '@liteship/cli', '@liteship/gauntlet']);
    // And the live digest (resolving the real built dist) is well-formed + deterministic.
    expect(gauntletToolchainDigest(ENV)).toBe(gauntletToolchainDigest(ENV));
    expect(gauntletToolchainDigest(ENV)).toMatch(/^tc-sha256:[0-9a-f]{32}$/);
  });
});

describe('THE CONTENT-ADDRESS LAW (the host fs store keyed by the engine key) — same hash hits, changed hash misses', () => {
  const TC = 'tc-sha256:deadbeef';
  const ENV = { node: 'v22', platform: 'linux', arch: 'x64', pm: '' } as const;
  const FILE = 'packages/core/src/x.ts';

  /** An IR where FILE has a given content address (the byte-state the cache keys on). */
  function irWith(contentDigest: string) {
    return makeRepoIR({ files: [{ id: FILE, contentDigest, packageName: '@liteship/core' }] });
  }

  it('UNCHANGED coverage hash → a HIT (the same engine key resolves the same on-disk slug)', () => {
    const cache = makeFsVerdictCache(dir);
    const key = gateVerdictKey({
      toolchainDigest: TC,
      gateId: 'g/one',
      coverageDigest: coverageDigestOf([FILE], irWith('blake3:aaaa')),
      env: ENV,
    });
    cache.write(key, SAMPLE);
    // Re-deriving the SAME key from the SAME byte-state hits the cached verdict.
    const sameKey = gateVerdictKey({
      toolchainDigest: TC,
      gateId: 'g/one',
      coverageDigest: coverageDigestOf([FILE], irWith('blake3:aaaa')),
      env: ENV,
    });
    expect(sameKey).toBe(key); // the engine key is content-addressed + deterministic
    expect(cache.read(sameKey)).toEqual(SAMPLE); // → a HIT
  });

  it('a CHANGED covered-file content digest flips the key → a MISS (re-run, the safe direction)', () => {
    const cache = makeFsVerdictCache(dir);
    const before = gateVerdictKey({
      toolchainDigest: TC,
      gateId: 'g/one',
      coverageDigest: coverageDigestOf([FILE], irWith('blake3:aaaa')),
      env: ENV,
    });
    cache.write(before, SAMPLE);
    const after = gateVerdictKey({
      toolchainDigest: TC,
      gateId: 'g/one',
      coverageDigest: coverageDigestOf([FILE], irWith('blake3:BBBB')), // the file's bytes changed
      env: ENV,
    });
    expect(after).not.toBe(before);
    expect(cache.read(after)).toBeNull(); // the stale verdict is NOT served under the new key
  });

  it('the MISSING_DIGEST_SENTINEL keys an absent file STABLY — never collides with a present-and-changed one', () => {
    // A covered file ABSENT from the IR folds the inert sentinel; the key is stable but
    // distinct from any real-content key, so a later present version cannot serve it.
    const absent = coverageDigestOf([FILE], makeRepoIR({ files: [] }));
    expect(absent).toContain(MISSING_DIGEST_SENTINEL);
    const present = coverageDigestOf([FILE], irWith('blake3:real'));
    expect(absent).not.toBe(present);
  });
});

describe('makeFsVerdictCache.read — the EISDIR/EACCES sound-MISS arm (uncertain ⇒ re-run, never a throw)', () => {
  it('a cache PATH that is a directory (EISDIR) reads as a MISS, not a throw', () => {
    const cache = makeFsVerdictCache(dir);
    // Write a real entry, then REPLACE its file with a directory at the same path so the
    // existsSync passes but readFileSync throws EISDIR → the sanctioned best-effort MISS.
    cache.write('eisdir-key', SAMPLE);
    const gdir = join(dir, '.liteship', 'cache', 'gauntlet');
    const file = join(gdir, readdirSync(gdir)[0] as string);
    rmSync(file);
    mkdirSync(file); // now a directory at the verdict path
    expect(statSync(file).isDirectory()).toBe(true);
    expect(cache.read('eisdir-key')).toBeNull(); // EISDIR ⇒ MISS
  });

  it.skipIf(eaccesUntestableAsRoot)('a cache file with the read bit cleared (EACCES) reads as a MISS, not a throw', () => {
    const cache = makeFsVerdictCache(dir);
    cache.write('eacces-key', SAMPLE);
    const gdir = join(dir, '.liteship', 'cache', 'gauntlet');
    const file = join(gdir, readdirSync(gdir)[0] as string);
    chmodSync(file, 0o000);
    try {
      expect(cache.read('eacces-key')).toBeNull(); // EACCES ⇒ sanctioned MISS
    } finally {
      chmodSync(file, 0o644); // restore so afterEach rmSync can clean up
    }
  });
});

describe('makeFsMutantVerdictCache — the B2 content-addressed mutant-verdict store (the sound-MISS twin)', () => {
  it('round-trips a verdict TAG under .liteship/cache/mutation, distinct keys do not collide', () => {
    const cache = makeFsMutantVerdictCache(dir);
    expect(cache.read('m-1')).toBeNull(); // absent → MISS
    cache.write('m-1', 'killed');
    cache.write('m-2', 'survived');
    expect(cache.read('m-1')).toBe('killed');
    expect(cache.read('m-2')).toBe('survived');

    const files = readdirSync(join(dir, '.liteship', 'cache', 'mutation'));
    expect(files.length).toBe(2);
    expect(files.every((f) => f.endsWith('.txt'))).toBe(true);
  });

  it('accepts ONLY the three sanctioned tags; any other on-disk value is a MISS, never a guessed serve', () => {
    const cache = makeFsMutantVerdictCache(dir);
    cache.write('m-x', 'no-coverage');
    expect(cache.read('m-x')).toBe('no-coverage');

    const mdir = join(dir, '.liteship', 'cache', 'mutation');
    const file = join(mdir, readdirSync(mdir)[0] as string);
    // A hand-edit / schema-drift value that is NOT one of the three tags → MISS.
    writeFileSync(file, 'equivalent\n', 'utf8'); // a real verdict tag, but NOT in the write set
    expect(cache.read('m-x')).toBeNull();
    writeFileSync(file, 'garbage-not-a-tag\n', 'utf8');
    expect(cache.read('m-x')).toBeNull();
  });

  it('trims surrounding whitespace before validating the tag (an atomic-write newline is fine)', () => {
    const cache = makeFsMutantVerdictCache(dir);
    cache.write('m-trim', 'killed');
    const mdir = join(dir, '.liteship', 'cache', 'mutation');
    const file = join(mdir, readdirSync(mdir)[0] as string);
    writeFileSync(file, '   survived  \n\n', 'utf8');
    expect(cache.read('m-trim')).toBe('survived');
  });

  it('a mutation cache PATH that is a directory (EISDIR) reads as a MISS, not a throw', () => {
    const cache = makeFsMutantVerdictCache(dir);
    cache.write('m-eisdir', 'killed');
    const mdir = join(dir, '.liteship', 'cache', 'mutation');
    const file = join(mdir, readdirSync(mdir)[0] as string);
    rmSync(file);
    mkdirSync(file);
    expect(cache.read('m-eisdir')).toBeNull();
  });

  it.skipIf(eaccesUntestableAsRoot)('a mutation cache file with the read bit cleared (EACCES) reads as a MISS, not a throw', () => {
    const cache = makeFsMutantVerdictCache(dir);
    cache.write('m-eacces', 'killed');
    const mdir = join(dir, '.liteship', 'cache', 'mutation');
    const file = join(mdir, readdirSync(mdir)[0] as string);
    chmodSync(file, 0o000);
    try {
      expect(cache.read('m-eacces')).toBeNull();
    } finally {
      chmodSync(file, 0o644);
    }
  });

  it('write is ATOMIC (no leftover .tmp files after a successful write)', () => {
    const cache = makeFsMutantVerdictCache(dir);
    cache.write('m-atomic', 'killed');
    const mdir = join(dir, '.liteship', 'cache', 'mutation');
    const leftovers = readdirSync(mdir).filter((f) => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]); // the temp-then-rename left no half-file
  });
});
