/**
 * CUT B1 — exactly one canonicalization path mints `fnv1a:` content addresses.
 *
 * The gremlin: `cborg.encode` (which hid inside `TypedRef.canonicalize`) and the
 * `CanonicalCbor` doctrine (ADR-0003) produce DIFFERENT bytes for float16/32-exact
 * numbers — cborg shrinks to the smallest float, CanonicalCbor always emits
 * float64. QuantizerConfig + EntityId minted identities through cborg, so the same
 * logical payload could get a different `fnv1a:` address than the documented path.
 *
 * B1 repointed those minters onto `CanonicalCbor`. This file (1) DOCUMENTS the
 * divergence so the rationale is permanent, (2) GUARDS that identity is never
 * again minted through cborg / `TypedRef.canonicalize` / raw `JSON.stringify`,
 * and (3) proves the seam is key-order-deterministic.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { encode as cborgEncode } from 'cborg';
import { CanonicalCbor, fnv1aBytes } from '@czap/core';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const hex = (b: Uint8Array): string => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');

describe('B1 — the divergence that made the two-encoder fork a substrate bug', () => {
  it('cborg shrinks a float16-exact value to half-precision; CanonicalCbor stays float64', () => {
    // 0.5 round-trips exactly in float16 → cborg emits `f9` (major 7, half).
    // CanonicalCbor always emits `fb` (float64). Different bytes → different fnv1a.
    const c = hex(cborgEncode({ x: 0.5 }));
    const k = hex(CanonicalCbor.encode({ x: 0.5 }));
    expect(c).toContain('f93800'); // half-precision 0.5
    expect(k).toContain('fb3fe0000000000000'); // double 0.5
    expect(c).not.toBe(k);
    expect(fnv1aBytes(cborgEncode({ x: 0.5 }))).not.toBe(fnv1aBytes(CanonicalCbor.encode({ x: 0.5 })));
  });

  it('the two encoders happen to AGREE on non-float16-exact floats — which is why the bug was latent', () => {
    // 0.3 does not round-trip in float16/32 → both emit float64 → equal. The fork
    // only bit when a payload float was float16/32-exact, so most runs looked fine.
    expect(hex(cborgEncode({ x: 0.3 }))).toBe(hex(CanonicalCbor.encode({ x: 0.3 })));
  });
});

describe('B1 — identity is minted only through CanonicalCbor (source guard, the cage)', () => {
  const IDENTITY_FILES = [
    'packages/quantizer/src/quantizer.ts',
    'packages/core/src/composable.ts',
    'packages/core/src/ecs.ts',
  ];

  for (const rel of IDENTITY_FILES) {
    it(`${rel} mints fnv1a identity via CanonicalCbor, not cborg/TypedRef.canonicalize/JSON.stringify`, () => {
      const src = readFileSync(resolve(REPO, rel), 'utf8');
      // The fnv1a identity call must pair with CanonicalCbor.encode.
      expect(src).toMatch(/fnv1a(Bytes)?\(\s*CanonicalCbor\.encode/);
      // None of the discredited identity paths may feed an fnv1a address.
      expect(src).not.toMatch(/fnv1a(Bytes)?\(\s*TypedRef\.canonicalize/);
      expect(src).not.toMatch(/fnv1a(Bytes)?\(\s*encode\(/); // raw cborg encode
      expect(src).not.toMatch(/fnv1a(Bytes)?\(\s*JSON\.stringify/);
    });
  }
});

describe('B1 — the canonical seam is key-order deterministic', () => {
  it('CanonicalCbor sorts map keys, so identity is permutation-stable', () => {
    expect(fnv1aBytes(CanonicalCbor.encode({ a: 1, b: 2 }))).toBe(fnv1aBytes(CanonicalCbor.encode({ b: 2, a: 1 })));
    expect(fnv1aBytes(CanonicalCbor.encode({ x: 0.5, y: 1.5 }))).toBe(fnv1aBytes(CanonicalCbor.encode({ y: 1.5, x: 0.5 })));
  });
});
