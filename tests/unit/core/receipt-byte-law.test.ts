/**
 * CUT typed-ref — the receipt/mutation byte law is named and caged (B1-follow).
 *
 * B1 collapsed the `fnv1a:` IDENTITY encoder fork onto `CanonicalCbor`
 * (always-float64, cross-payload agreement). One cborg path stayed behind on
 * purpose: `TypedRef.canonicalize` (cborg.encode) → SHA-256 receipt/mutation
 * hashing. The survey found ZERO `fnv1a:` consumers of it — its consumer family
 * is the receipt chain (`TypedRef.create`, `Receipt.hashEnvelope`/`createEnvelope`).
 * (`LiveCell.make`/`makeBoundary` once borrowed this path for its envelope id;
 * CUT live-cell migrated that id to the fnv1a IDENTITY law — it is content-
 * addressing that auto-invalidates on change, not a signed/chained receipt digest.)
 *
 * That is correct, not a B1 miss: a receipt chain only compares its own
 * cborg→sha256 bytes against its own cborg→sha256 bytes — there is no
 * cross-encoder comparison, so CanonicalCbor's always-float64 rule buys it no
 * correctness, and migrating would invalidate persisted sha256 receipts for
 * nothing. cborg cannot leave the repo anyway (CanonicalCbor is encode-only;
 * `ShipCapsule.decode` needs cborg.decode).
 *
 * LiteShip therefore has TWO intentional, distinct byte laws:
 *   1. IDENTITY (`fnv1a:`)  — CanonicalCbor, always-float64, cross-payload law.
 *   2. RECEIPT (`sha256:`)  — TypedRef.canonicalize (cborg), smallest-float,
 *                             intra-chain-determinism + permanence law.
 *
 * These guards pin: the receipt byte law is cborg-backed and receipt/sha256-only;
 * no `fnv1a:` minter feeds through it (repo-wide); the typed-ref docs name the law
 * instead of the old false "→ FNV-1a hash" / "CBOR-ish" language; and the
 * cborg-vs-CanonicalCbor float divergence is documented as INTENTIONAL here.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { encode as cborgEncode } from 'cborg';
import { CanonicalCbor } from '@liteship/core';
import { bytesToHex } from '@liteship/canonical';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const read = (rel: string): string => readFileSync(resolve(REPO, rel), 'utf8');

/** Recursively collect every `.ts` source file under packages/<x>/src. */
function packageSources(): string[] {
  const out: string[] = [];
  const pkgRoot = resolve(REPO, 'packages');
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.ts')) out.push(full);
    }
  };
  for (const pkg of readdirSync(pkgRoot)) {
    const src = join(pkgRoot, pkg, 'src');
    try {
      if (statSync(src).isDirectory()) walk(src);
    } catch {
      /* package without src/ */
    }
  }
  return out;
}

describe('typed-ref — the receipt byte law is cborg-backed (intentional)', () => {
  it('TypedRef.canonicalize encodes via cborg', () => {
    const src = read('packages/core/src/typed-ref.ts');
    expect(src).toMatch(/import\s*\{\s*encode\s*\}\s*from\s*'cborg'/);
    expect(src).toMatch(/canonicalize\s*=\s*\(value:\s*unknown\):\s*Uint8Array\s*=>\s*encode\(value\)/);
  });

  it('canonicalize feeds SHA-256 (the only hashing primitive in typed-ref)', () => {
    // The only hashing primitive here is SHA-256; there is no fnv1a *call* in this
    // module (the repo-wide cage below proves no fnv1a minter consumes canonicalize).
    const src = read('packages/core/src/typed-ref.ts');
    expect(src).toMatch(/crypto\.subtle\.digest\(\s*'SHA-256'/);
    expect(src).toMatch(/return\s*`sha256:/);
    expect(src).not.toMatch(/fnv1a(Bytes)?\(/); // no fnv1a hashing call — sha256 only
  });
});

describe('typed-ref — the docs NAME the receipt byte law (no more lying comments)', () => {
  const src = read('packages/core/src/typed-ref.ts');

  it('drops the false "→ FNV-1a hash" claim (this module produces sha256)', () => {
    expect(src).not.toMatch(/FNV-1a hash/);
    expect(src).not.toMatch(/→\s*FNV-1a/);
  });

  it('drops the "CBOR-ish" hedge', () => {
    expect(src).not.toMatch(/CBOR-ish/i);
  });

  it('states the receipt byte law: cborg + sha256, distinct from CanonicalCbor, not for fnv1a identity', () => {
    expect(src).toMatch(/cborg/);
    expect(src).toMatch(/sha-?256/i);
    expect(src).toMatch(/CanonicalCbor/); // names the OTHER law it is distinct from
    expect(src).toMatch(/fnv1a/i); // explicitly says NOT for fnv1a identity
    expect(src).toMatch(/receipt/i); // names the law
  });
});

describe('typed-ref — no fnv1a identity path feeds through TypedRef.canonicalize (repo-wide cage)', () => {
  it('zero `fnv1a(... TypedRef.canonicalize ...)` minters exist anywhere in packages/*/src', () => {
    const offenders: string[] = [];
    for (const file of packageSources()) {
      const src = readFileSync(file, 'utf8');
      // The pattern B1 forbade: an fnv1a address minted from cborg bytes.
      if (/fnv1a(Bytes)?\(\s*(TypedRefModule|TypedRef)\.canonicalize/.test(src)) {
        offenders.push(file.replace(REPO, '').replace(/\\/g, '/'));
      }
    }
    expect(offenders, `fnv1a identity must never mint through TypedRef.canonicalize: ${offenders.join(', ')}`).toEqual([]);
  });

  it('LiveCell mints its envelope id via the fnv1a IDENTITY law, never the sha256 receipt path', () => {
    // CUT live-cell — LiveCell is content-addressing, not a receipt. It must mint
    // through CanonicalCbor → fnv1a and never import the typed-ref receipt hashers.
    const src = read('packages/core/src/live-cell.ts');
    expect(src).toMatch(/fnv1aBytes\(\s*CanonicalCbor\.encode/);
    // No IMPORT of the typed-ref receipt hashers (the bare token appears in prose).
    expect(src, 'live-cell must not import the sha256 receipt hashers').not.toMatch(/from\s*['"]\.\/typed-ref/);
  });

  it('the B1 identity files do not reference TypedRef.canonicalize at all', () => {
    const B1_IDENTITY_FILES = [
      'packages/quantizer/src/quantizer.ts',
      'packages/core/src/composable.ts',
      'packages/core/src/ecs.ts',
      'packages/core/src/config.ts',
    ];
    for (const rel of B1_IDENTITY_FILES) {
      expect(read(rel), `${rel} must not reference TypedRef.canonicalize`).not.toMatch(/TypedRef(Module)?\.canonicalize/);
    }
  });
});

describe('typed-ref — the two byte laws diverge, and that is INTENTIONAL for receipts', () => {
  it('cborg (receipt law) and CanonicalCbor (identity law) differ on a float16-exact value', () => {
    // 0.5 round-trips in float16 → cborg shrinks it (f93800); CanonicalCbor stays
    // float64 (fb3fe0000000000000). For the receipt chain this divergence is
    // harmless: it never cross-compares the two encoders. Pinned so a future
    // "let's unify the encoders" edit trips THIS guard (and re-ratification)
    // instead of silently invalidating persisted sha256 receipts.
    const receiptBytes = bytesToHex(cborgEncode({ x: 0.5 }));
    const identityBytes = bytesToHex(CanonicalCbor.encode({ x: 0.5 }));
    expect(receiptBytes).toContain('f93800');
    expect(identityBytes).toContain('fb3fe0000000000000');
    expect(receiptBytes).not.toBe(identityBytes);
  });

  it('both encoders agree when no float is float16/32-exact (so most receipts look identical)', () => {
    expect(bytesToHex(cborgEncode({ x: 0.3 }))).toBe(bytesToHex(CanonicalCbor.encode({ x: 0.3 })));
  });
});
