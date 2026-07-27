// PROVES: INV-VERDICT-CACHE-KEY-DETERMINISTIC, INV-TOOLCHAIN-DIGEST-INVALIDATES
/**
 * Determinism + anti-lie laws for the B2 verdict cache key
 * (`@liteship/gauntlet`'s {@link gateVerdictKey} + {@link coverageDigestOf}). The
 * verdict cache is the one place SOUNDNESS is everything: serving a stale "green"
 * when covered code has changed would let a real defect ship. Two laws pin it:
 *
 *  • INV-VERDICT-CACHE-KEY-DETERMINISTIC — the key is a PURE function of its four
 *    soundness inputs: SAME inputs (incl. env maps differing only in insertion
 *    order) ⇒ BYTE-IDENTICAL key, every run. If the key flapped, a verdict cached
 *    this run could never be found next run (or worse, a different verdict's slot
 *    could be hit). The coverage digest is likewise order/multiplicity-independent.
 *
 *  • INV-TOOLCHAIN-DIGEST-INVALIDATES — a change in ANY soundness input (a covered
 *    file's contentDigest, the toolchainDigest, the gateId, or the env fingerprint)
 *    ⇒ a DIFFERENT key (a cache MISS ⇒ a re-run). This is what makes a stale serve
 *    IMPOSSIBLE: tamper with any input and the key MUST move off the cached slot.
 *    The toolchainDigest case is the keystone — editing a gate's LOGIC while its
 *    covered files are byte-identical must still invalidate every cached verdict.
 *
 * The test proves the keys would CATCH a determinism break: a tampered input is
 * shown to yield a different key (the property is the contrapositive of "a stale
 * verdict can never be served").
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  gateVerdictKey,
  coverageDigestOf,
  makeRepoIR,
  type GateVerdictKeyParts,
  type FileId,
  type FileNode,
  type RepoIR,
} from '@liteship/gauntlet';

// ─────────────────────────── arbitraries ───────────────────────────

/** A lowercase-hex string arbitrary (fast-check v4 dropped the `hexaString` alias). */
const HEX_UNIT = fc.constantFrom(...'0123456789abcdef'.split(''));
const hexArb = (minLength: number, maxLength: number): fc.Arbitrary<string> =>
  fc.string({ unit: HEX_UNIT, minLength, maxLength });

/** A FileId — a POSIX-ish repo-relative path (no control bytes, the key's domain). */
const fileIdArb = fc
  .tuple(
    fc.constantFrom('packages', 'tests', 'scripts'),
    fc.constantFrom('core', 'gauntlet', 'audit', 'cli'),
    fc.constantFrom('a', 'b', 'c', 'index'),
  )
  .map(([a, b, c]) => `${a}/${b}/src/${c}.ts` as FileId);

/** A content digest display string (the `algo:hex` form the host mints). */
const digestArb = hexArb(8, 16).map((h) => `blake3:${h}`);

/** A small env fingerprint map (node/platform/arch/pm — the host supplies it). */
const envArb = fc.record({
  node: fc.constantFrom('v20.0.0', 'v22.22.3'),
  platform: fc.constantFrom('linux', 'darwin'),
  arch: fc.constantFrom('x64', 'arm64'),
  pm: fc.constantFrom('pnpm@9', 'pnpm@10'),
});

const keyPartsArb: fc.Arbitrary<GateVerdictKeyParts> = fc.record({
  toolchainDigest: hexArb(8, 16).map((h) => `tc:${h}`),
  gateId: fc.constantFrom('gauntlet/no-bare-throw', 'gauntlet/no-placeholder', 'gauntlet/perf'),
  coverageDigest: fc.string({ minLength: 1, maxLength: 40 }),
  env: envArb,
});

/** Build a tiny RepoIR over `(fileId, digest)` pairs so coverageDigestOf has an IR. */
function irOf(pairs: ReadonlyArray<readonly [FileId, string]>): RepoIR {
  const seen = new Map<FileId, string>();
  for (const [id, digest] of pairs) seen.set(id, digest); // last write wins → unique ids
  const files: FileNode[] = [...seen].map(([id, contentDigest]) => ({ id, contentDigest, packageName: null }));
  return makeRepoIR({ files, symbols: [], imports: [], packages: [], refs: new Map(), facts: [] });
}

/** Re-key an env object in a shuffled insertion order (same entries, new order). */
function reorderEnv(env: Record<string, string>, rotate: number): Record<string, string> {
  const keys = Object.keys(env);
  const out: Record<string, string> = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[(i + rotate) % keys.length]!;
    out[k] = env[k]!;
  }
  return out;
}

describe('verdict-cache key determinism (INV-VERDICT-CACHE-KEY-DETERMINISTIC)', () => {
  it('SAME inputs ⇒ BYTE-IDENTICAL key, regardless of env insertion order', () => {
    fc.assert(
      fc.property(keyPartsArb, fc.integer({ min: 0, max: 4 }), (parts, rotate) => {
        const first = gateVerdictKey(parts);
        const second = gateVerdictKey(parts);
        // Pure determinism: two evaluations of the same parts agree byte-for-byte.
        expect(second).toBe(first);
        // Canonicalization: an env map with the SAME entries in a different
        // insertion order keys IDENTICALLY (the sorted-key fold).
        const reordered: GateVerdictKeyParts = { ...parts, env: reorderEnv(parts.env, rotate) };
        expect(gateVerdictKey(reordered)).toBe(first);
      }),
      { numRuns: 300, seed: 0xca0e },
    );
  });

  it('coverageDigestOf is order- and multiplicity-independent (sorted, de-duped fold)', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.tuple(fileIdArb, digestArb), { minLength: 1, maxLength: 6, selector: (p) => p[0] }), (pairs) => {
        const ir = irOf(pairs);
        const ids = pairs.map((p) => p[0]);
        const forward = coverageDigestOf(ids, ir);
        const reversed = coverageDigestOf([...ids].reverse(), ir);
        const duplicated = coverageDigestOf([...ids, ...ids], ir);
        // The digest is a SET fold: order and duplicates do not change it.
        expect(reversed).toBe(forward);
        expect(duplicated).toBe(forward);
      }),
      { numRuns: 200, seed: 0xc0e2 },
    );
  });
});

describe('verdict-cache anti-lie: any soundness input change ⇒ a different key (INV-TOOLCHAIN-DIGEST-INVALIDATES)', () => {
  it('a different toolchainDigest moves the key (a gate-logic edit invalidates every cached verdict)', () => {
    fc.assert(
      fc.property(keyPartsArb, hexArb(8, 16), (parts, other) => {
        const otherTc = `tc:${other}`;
        fc.pre(otherTc !== parts.toolchainDigest);
        expect(gateVerdictKey({ ...parts, toolchainDigest: otherTc })).not.toBe(gateVerdictKey(parts));
      }),
      { numRuns: 200, seed: 0x70017 },
    );
  });

  it('a different gateId / coverageDigest / env value each move the key (no stale serve across any input)', () => {
    fc.assert(
      fc.property(keyPartsArb, (parts) => {
        const base = gateVerdictKey(parts);
        // gateId change.
        expect(gateVerdictKey({ ...parts, gateId: `${parts.gateId}-x` })).not.toBe(base);
        // coverageDigest change (a covered byte changed ⇒ a new digest).
        expect(gateVerdictKey({ ...parts, coverageDigest: `${parts.coverageDigest}!` })).not.toBe(base);
        // env value change (a different node/platform never serves another's verdict).
        expect(gateVerdictKey({ ...parts, env: { ...parts.env, node: `${parts.env.node}-edge` } })).not.toBe(base);
      }),
      { numRuns: 200, seed: 0xe2da },
    );
  });

  it('a TAMPERED covered-file digest flips the coverage digest ⇒ flips the key (the cache would catch it)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.tuple(fileIdArb, digestArb), { minLength: 1, maxLength: 5, selector: (p) => p[0] }),
        keyPartsArb,
        (pairs, parts) => {
          const irClean = irOf(pairs);
          const ids = pairs.map((p) => p[0]);
          const cleanCoverage = coverageDigestOf(ids, irClean);
          const cleanKey = gateVerdictKey({ ...parts, coverageDigest: cleanCoverage });

          // Tamper ONE covered file's content digest (a covered byte changed under us).
          const tampered = pairs.map((p, i) => (i === 0 ? ([p[0], `${p[1]}-tampered`] as const) : p));
          const irTampered = irOf(tampered);
          const tamperedCoverage = coverageDigestOf(ids, irTampered);
          const tamperedKey = gateVerdictKey({ ...parts, coverageDigest: tamperedCoverage });

          // The tampered content yields a DIFFERENT coverage digest ⇒ a DIFFERENT
          // key ⇒ a cache MISS ⇒ a re-run. A stale verdict can never be served.
          expect(tamperedCoverage).not.toBe(cleanCoverage);
          expect(tamperedKey).not.toBe(cleanKey);
        },
      ),
      { numRuns: 150, seed: 0x7a3e },
    );
  });
});
