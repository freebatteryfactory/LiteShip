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
 * CUT B5a extends the cage to `packages/core/src/authoring/config.ts` — `defineConfig` was
 * the LAST internal `fnv1a:` minter still on the off-doctrine path (top-level-only
 * key sort + `JSON.stringify`), so it is now folded into IDENTITY_FILES. The one
 * deliberate exception — `mcp-server` `canonicalJson` behind `resultId` — is a
 * JSON-PROTOCOL identity (MCP wire is JSON; D1/B2 law), not an internal content
 * address; it is guarded separately below as the single allowed JSON canonicalizer.
 *
 * CUT live-cell folds `packages/core/src/reactive/live-cell.ts` into the cage too: the
 * `CellEnvelope.id` is a content-address IDENTITY (auto-invalidates on value
 * change), so it mints `fnv1a:` via CanonicalCbor like the rest of the family —
 * it had been borrowing the sha256 receipt byte law by accident.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { encode as cborgEncode } from 'cborg';
import { CanonicalCbor, fnv1aBytes } from '@liteship/core';
import { bytesToHex } from '@liteship/canonical';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('B1 — the divergence that made the two-encoder fork a substrate bug', () => {
  it('cborg shrinks a float16-exact value to half-precision; CanonicalCbor stays float64', () => {
    // 0.5 round-trips exactly in float16 → cborg emits `f9` (major 7, half).
    // CanonicalCbor always emits `fb` (float64). Different bytes → different fnv1a.
    const c = bytesToHex(cborgEncode({ x: 0.5 }));
    const k = bytesToHex(CanonicalCbor.encode({ x: 0.5 }));
    expect(c).toContain('f93800'); // half-precision 0.5
    expect(k).toContain('fb3fe0000000000000'); // double 0.5
    expect(c).not.toBe(k);
    expect(fnv1aBytes(cborgEncode({ x: 0.5 }))).not.toBe(fnv1aBytes(CanonicalCbor.encode({ x: 0.5 })));
  });

  it('the two encoders happen to AGREE on non-float16-exact floats — which is why the bug was latent', () => {
    // 0.3 does not round-trip in float16/32 → both emit float64 → equal. The fork
    // only bit when a payload float was float16/32-exact, so most runs looked fine.
    expect(bytesToHex(cborgEncode({ x: 0.3 }))).toBe(bytesToHex(CanonicalCbor.encode({ x: 0.3 })));
  });
});

describe('B1 — identity is minted only through CanonicalCbor (source guard, the cage)', () => {
  const IDENTITY_FILES = [
    'packages/quantizer/src/quantizer.ts',
    'packages/core/src/evidence/content-address.ts', // P2 — the extracted shared mint kernel (contentAddressOf)
    'packages/core/src/authoring/composable.ts',
    'packages/core/src/ecs.ts',
    'packages/core/src/authoring/config.ts', // CUT B5a — defineConfig folded into the cage
    'packages/core/src/reactive/live-cell.ts', // CUT live-cell — envelope id is fnv1a identity, not a sha256 receipt
  ];

  for (const rel of IDENTITY_FILES) {
    it(`${rel} mints fnv1a identity via CanonicalCbor, not cborg/TypedRef.canonicalize/JSON.stringify`, () => {
      const src = readFileSync(resolve(REPO, rel), 'utf8');
      // The fnv1a identity is minted either DIRECTLY (fnv1aBytes(CanonicalCbor.encode(...)))
      // or by ROUTING through the one shared kernel `contentAddressOf` (P2 extraction).
      expect(src).toMatch(/fnv1a(Bytes)?\(\s*CanonicalCbor\.encode|contentAddressOf\(/);
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

describe('B5a — exactly one JSON canonicalizer, and it is the protocol-bound resultId carve-out', () => {
  /** Recursively collect every `.ts` source under packages/*‍/src (skipping dist/node_modules). */
  const walkPackageSources = (): string[] => {
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) out.push(full);
      }
    };
    walk(resolve(REPO, 'packages'));
    return out;
  };

  it('only ONE `canonicalJson` definition exists under packages/, and it lives in mcp-server dispatch', () => {
    const definers = walkPackageSources().filter((f) => /function\s+canonicalJson\b|canonicalJson\s*=/.test(readFileSync(f, 'utf8')));
    expect(definers).toHaveLength(1);
    expect(definers[0].replace(/\\/g, '/')).toMatch(/packages\/mcp-server\/src\/dispatch\.ts$/);
  });

  it('the resultId canonicalizer is documented as JSON-PROTOCOL identity, not an internal content address', () => {
    const src = readFileSync(resolve(REPO, 'packages/mcp-server/src/dispatch.ts'), 'utf8');
    // The carve-out must announce WHY it is JSON, not CanonicalCbor (the B1 doctrine).
    expect(src).toMatch(/JSON[- ]protocol/i);
    // resultId stays on the fnv1a(canonicalJson(...)) path — deliberately NOT CanonicalCbor.
    expect(src).toMatch(/fnv1a\(\s*\n?\s*canonicalJson/);
  });
});
