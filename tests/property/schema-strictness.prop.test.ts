/**
 * schema-strictness — auto-derived near-miss strictness properties (scar S1.1 / GUARD 3).
 *
 * The EdgeSeed scar (`docs/plan/scar-ledger.md` S1.1): an arity-2 tuple silently
 * widened to `schema.array(schema.number)` because the Wave-0 kernel had no tuple node, and
 * EVERY existing test stayed green because tests feed VALID values. The disposition
 * (master plan Methodology §7) is auto-derived strictness properties: derive
 * near-miss mutators from each schema's OWN AST and property-assert that strict
 * decode REJECTS each one with the predicted issue code + path. Every schema, past
 * and future, then gets strictness-fidelity coverage for free.
 *
 * This suite sweeps two corpora:
 *
 *   1. THE LIVE CATALOG — every capsule contract in the repo. Enumeration is the
 *      SINGLE OWNER `detectCapsuleCalls` (`scripts/lib/capsule-detector.ts`), the
 *      exact type-directed detector `scripts/capsule-compile.ts` uses; each detected
 *      source module is imported so it self-registers into the live
 *      `getCapsuleCatalog()`, and both its input and output schema are swept. No
 *      private capsule list is forked (scar S0.4).
 *   2. THE KERNEL CORPUS — a hand-built set exercising every node kind and the
 *      EdgeSeed shape directly, so every mutator fires regardless of catalog drift.
 *
 * For each schema: seeded valid values strict-decode ok, and EVERY derived near-miss
 * is rejected with the predicted code + path prefix. Carve-outs are recorded with an
 * explicit reason — never a silent skip. The final case is the RED-PROVE: it
 * constructs a tuple's `schema.array` twin in memory and shows the derived arity near-miss
 * distinguishes them (the tuple rejects it; the array twin swallows it) — exactly the
 * EdgeSeed widening this scar closes.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import fastGlob from 'fast-glob';
import { hasTag } from '@liteship/error';
import { getCapsuleCatalog } from '@liteship/core';
import { scaledTimeout } from '../../vitest.shared.js';
import { detectCapsuleCalls, FACTORY_HINTS } from '../../scripts/lib/capsule-detector.js';
import { withArbitrary, decode, isSchema, schema } from '../../packages/core/src/schema/index.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import type { Schema } from '../../packages/core/src/schema/ast.js';
import type { DecodePath } from '../../packages/core/src/schema/decode.js';
import { deriveNearMisses, acceptsAnyValue } from '../support/near-miss.js';

/** Fixed seed — every fast-check run in this file is deterministic (no wall clock, no network). */
const SEED = 0x5ca55eed;
/** Property runs per schema — bounded so the whole-catalog sweep stays fast and deterministic. */
const NUM_RUNS = 25;

// ── Corpus model ────────────────────────────────────────────────────────────

type Origin = 'catalog' | 'kernel-corpus';

/** A named schema candidate before strictness classification. `schema` is `unknown` until `isSchema` narrows it. */
interface Named {
  readonly id: string;
  readonly schema: unknown;
  readonly origin: Origin;
}

/** A schema that survived classification and will be swept. */
interface Swept {
  readonly id: string;
  readonly origin: Origin;
  readonly schema: Schema<unknown, unknown>;
  readonly arb: fc.Arbitrary<unknown>;
  /** Near-misses derived from one seeded sample — the order-independent floor input. */
  readonly sampleNearMissCount: number;
}

/** A schema carved out of the sweep, with the honest reason. */
interface Skipped {
  readonly id: string;
  readonly origin: Origin;
  readonly reason: string;
}

function pathStartsWith(path: DecodePath, prefix: DecodePath): boolean {
  if (prefix.length > path.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) return false;
  }
  return true;
}

// ── 1. Enumerate the live catalog via the single-owner detector ─────────────

const REPO_ROOT = resolve(import.meta.dirname, '../..');
// The same globs + hint pre-filter `scripts/capsule-compile.ts` feeds the detector.
// FACTORY_HINTS is imported from the detector lib — its single owner (scar S1.5.2) —
// so this sweep's candidate set can never drift from the compile driver's.
const candidateFiles = (
  await fastGlob(['packages/**/src/**/*.ts', 'examples/**/*.ts'], {
    ignore: ['**/*.d.ts', '**/node_modules/**', '**/dist/**'],
    absolute: true,
    cwd: REPO_ROOT,
  })
).filter((file) => {
  try {
    const src = readFileSync(file, 'utf8');
    return FACTORY_HINTS.some((hint) => src.includes(hint));
  } catch {
    return false;
  }
});

const detectedSourceFiles = [...new Set(detectCapsuleCalls(candidateFiles).map((call) => call.file))].sort();
// Import each detected module so it registers its capsule(s) into the live catalog.
for (const file of detectedSourceFiles) {
  await import(pathToFileURL(file).href);
}
const catalog = getCapsuleCatalog();

const catalogNamed: readonly Named[] = catalog.flatMap((cap): readonly Named[] => [
  { id: `${cap.name}#input`, schema: cap.input, origin: 'catalog' },
  { id: `${cap.name}#output`, schema: cap.output, origin: 'catalog' },
]);

// ── 2. The kernel corpus — every node kind + the EdgeSeed shape ─────────────

function corpus(id: string, schema: Schema<unknown, unknown>): Named {
  return { id, schema, origin: 'kernel-corpus' };
}

const kernelCorpus: readonly Named[] = [
  corpus('corpus:scalars', schema.struct({ id: schema.string, count: schema.number, active: schema.boolean })),
  corpus('corpus:edge-seed-tuple', schema.tuple(schema.number, schema.number)),
  corpus('corpus:tuple-in-struct', schema.struct({ edge: schema.tuple(schema.number, schema.number), label: schema.literal('edge') })),
  corpus('corpus:heterogeneous-tuple', schema.tuple(schema.string, schema.number, schema.boolean)),
  corpus('corpus:union', schema.union(schema.literal('a'), schema.literal('b'), schema.number)),
  corpus('corpus:union-in-struct', schema.struct({ tag: schema.union(schema.literal('x'), schema.number), n: schema.number })),
  corpus('corpus:record', schema.record(schema.number)),
  corpus('corpus:array-of-struct', schema.array(schema.struct({ x: schema.number, y: schema.optional(schema.string) }))),
  corpus(
    'corpus:nested',
    schema.struct({
      meta: schema.record(schema.string),
      pair: schema.tuple(schema.string, schema.number),
      tags: schema.array(schema.string),
      opt: schema.optional(schema.boolean),
    }),
  ),
  corpus('corpus:literals', schema.struct({ nothing: schema.literal(null), one: schema.literal(1), yes: schema.literal(true) })),
  corpus('corpus:bytes', withArbitrary(schema.bytes(Uint8Array), () => fc.uint8Array({ minLength: 1, maxLength: 8 }))),
];

// ── Classify every candidate into swept vs. carved-out ──────────────────────

const swept: Swept[] = [];
const skipped: Skipped[] = [];

for (const named of [...catalogNamed, ...kernelCorpus]) {
  if (!isSchema(named.schema)) {
    skipped.push({
      id: named.id,
      origin: named.origin,
      reason: 'not a kernel schema (a plain declaration or non-kernel value) — excluded from the strict-decode sweep',
    });
    continue;
  }
  const schema = named.schema;
  if (acceptsAnyValue(schema.ast)) {
    skipped.push({
      id: named.id,
      origin: named.origin,
      reason: 'root accepts every value (schema.unknown / schema.any) — no strictness near-miss exists',
    });
    continue;
  }
  let arb: fc.Arbitrary<unknown>;
  try {
    arb = schemaToArbitrary(schema);
  } catch (err) {
    if (hasTag(err, 'UnsupportedError')) {
      skipped.push({ id: named.id, origin: named.origin, reason: `not structurally sampleable — ${err.message}` });
      continue;
    }
    throw err;
  }
  const sample = fc.sample(arb, { numRuns: 1, seed: SEED })[0];
  swept.push({ id: named.id, origin: named.origin, schema, arb, sampleNearMissCount: deriveNearMisses(schema, sample).length });
}

// ── The sweep — one property per schema ─────────────────────────────────────

describe('schema strictness — auto-derived near-miss sweep (scar S1.1)', () => {
  for (const entry of swept) {
    it(`${entry.origin}: ${entry.id}`, () => {
      fc.assert(
        fc.property(entry.arb, (value) => {
          // Valid values strict-decode cleanly.
          const valid = decode(entry.schema, value);
          expect(valid.ok, `a schema-conformant value failed strict decode for ${entry.id}`).toBe(true);
          // Every derived near-miss is rejected with the predicted code + path prefix.
          for (const nm of deriveNearMisses(entry.schema, value)) {
            const rejected = decode(entry.schema, nm.mutated);
            expect(rejected.ok, `near-miss NOT rejected [${entry.id}]: ${nm.label}`).toBe(false);
            if (rejected.ok) continue;
            const matched = rejected.error.some((issue) => issue.code === nm.code && pathStartsWith(issue.path, nm.pathPrefix));
            expect(
              matched,
              `near-miss [${entry.id}] "${nm.label}" expected ${nm.code} at prefix [${nm.pathPrefix.join('/')}] — got ${JSON.stringify(rejected.error)}`,
            ).toBe(true);
          }
        }),
        { seed: SEED, numRuns: NUM_RUNS },
      );
    }, scaledTimeout(30_000));
  }
});

// ── Anti-vacuous floors + honest carve-out ledger ───────────────────────────

describe('schema strictness — coverage floors (scar S1.1)', () => {
  it('sweeps a non-vacuous catalog + corpus floor with the derivation actually firing', () => {
    // The sweep must not silently collapse to empty (S0.3 vacuous-gate class).
    expect(swept.length).toBeGreaterThanOrEqual(20);
    // A known catalog struct contract is genuinely swept (anchor against enumeration drift).
    expect(swept.some((s) => s.id === 'core.boundary.evaluate#input')).toBe(true);
    // Both corpora contribute.
    expect(swept.some((s) => s.origin === 'catalog')).toBe(true);
    expect(swept.some((s) => s.origin === 'kernel-corpus')).toBe(true);
    // The derivation actually produced near-misses — a guard never seen to mutate is decoration.
    const totalNearMisses = swept.reduce((n, s) => n + s.sampleNearMissCount, 0);
    expect(totalNearMisses).toBeGreaterThanOrEqual(80);
  });

  it('records every carve-out with an explicit reason (no silent skips)', () => {
    for (const s of skipped) {
      expect(s.reason.length, `carve-out ${s.id} has no reason`).toBeGreaterThan(0);
    }
    // The `examples.intro` scene composition declares permissive `schema.unknown` I/O —
    // it MUST land as an honest carve-out (root accepts every value), proving a
    // too-loose schema is surfaced, not silently swept as if strict. (Wave 8 moved
    // its I/O from effect `Schema.Unknown` to the native `schema.unknown` kernel schema, so
    // the carve-out reason shifted from "not a kernel schema" to "accepts every value".)
    expect(
      skipped.some((s) => s.id.startsWith('examples.intro') && s.reason.includes('root accepts every value')),
    ).toBe(true);
  });
});

// ── RED-PROVE — the EdgeSeed tuple→array widening the scar names ─────────────

describe('schema strictness — EdgeSeed widening red-prove (scar S1.1)', () => {
  it('the derived tuple arity near-miss distinguishes a tuple from its schema.array twin', () => {
    const tuplePair = schema.tuple(schema.number, schema.number); // the correct, strict shape
    const arrayTwin = schema.array(schema.number); // the silent EdgeSeed widening
    const seed: readonly number[] = [1, 2];

    const nearMisses = deriveNearMisses(tuplePair, seed);
    const arityPlus = nearMisses.find((nm) => nm.label.startsWith('tuple arity +1'));
    const arityMinus = nearMisses.find((nm) => nm.label.startsWith('tuple arity -1'));
    expect(arityPlus, 'the tuple AST must yield an arity +1 near-miss').toBeDefined();
    expect(arityMinus, 'the tuple AST must yield an arity -1 near-miss').toBeDefined();
    if (arityPlus === undefined || arityMinus === undefined) return;

    // The padding duplicates a valid element, so ONLY arity — never the padding
    // value's type — distinguishes the tuple from its array twin.
    expect(arityPlus.mutated).toEqual([1, 2, 2]);
    expect(arityMinus.mutated).toEqual([1]);

    // The CORRECT tuple rejects both near-misses exactly as predicted.
    for (const nm of [arityPlus, arityMinus]) {
      const res = decode(tuplePair, nm.mutated);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.some((issue) => issue.code === 'schema/type' && issue.path.length === 0)).toBe(true);
      }
    }

    // The schema.array twin SWALLOWS both — every element is a number. So had the tuple
    // been silently widened to its array twin, these near-misses would stop being
    // rejected and the sweep above would go RED. That is precisely the EdgeSeed blind
    // spot this scar closes: happy-path tests never notice, the near-miss suite does.
    expect(decode(arrayTwin, arityPlus.mutated).ok).toBe(true);
    expect(decode(arrayTwin, arityMinus.mutated).ok).toBe(true);
  });
});
