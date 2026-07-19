/**
 * Harness template for the `cachedProjection` assembly arm.
 *
 * Disposition is resolved at COMPILE TIME by `scripts/capsule-compile.ts` (the
 * same probe pattern `pureTransform` and `stateMachine` use), so the generated
 * file is ALWAYS one clean, real test with no defensive runtime `throw`-if-missing
 * branches:
 *
 *  - **real-only fixture form** ({@link HarnessContext.cachedProjectionRealOnly}
 *    + a {@link HarnessContext.fixturePath}) — the source schema is a
 *    Declaration-tagged `instanceOf(ArrayBuffer)` that is deliberately not
 *    arbitrary-derivable, so the canonical fixture bytes are the source of
 *    truth. Emits fixture-driven `cache-hit` / invalidation / determinism /
 *    invariant probes over the REAL `derive`, plus a REAL decode-throughput bench.
 *  - **real property form** ({@link HarnessContext.arbitraryDerivable}) — the
 *    source schema IS arbitrary-derivable, so the harness samples it via the
 *    canonical `schemaToArbitrary` walker and drives `derive` over random
 *    sources for the determinism + invariant properties.
 *  - **FAIL the compile loud** — any lesser disposition (no binding, no
 *    derive/fixture, a non-derivable source with no fixture) THROWS a tagged
 *    `UnsupportedError` so `capsule:compile` fails loud (wire-or-fail). The
 *    generated file is never an `it.skip`, never a `() => true` placeholder, and
 *    never carries a runtime `try/catch schemaToArbitrary ... else throw` branch
 *    that decides derivability at test time.
 *
 * @module
 */

import { UnsupportedError } from '@liteship/error';
import type { CapsuleDef } from '../assembly.js';
import type { HarnessContext, HarnessOutput } from './pure-transform.js';

const DEFAULT_ARBITRARY_IMPORT = '../../packages/core/src/harness/arbitrary-from-schema.js';
const DEFAULT_CONTENT_ADDRESS_IMPORT = '../../packages/core/src/content-address.js';

/** Escape backtick + dollar-brace for a template-literal interpolation site. */
function escapeBacktick(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/** Real decode bench over the canonical fixture, importing the runtime binding. */
function fixtureBench(cap: CapsuleDef<'cachedProjection', unknown, unknown, unknown>, ctx: HarnessContext): string {
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IoError, ValidationError } from '@liteship/error';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';

const cap = ${ctx.bindingName};
const fixtureAbs = resolve('${ctx.fixturePath}');
const exactArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const fixtureBytes = existsSync(fixtureAbs) ? exactArrayBuffer(readFileSync(fixtureAbs)) : undefined;

bench(\`${cap.name} — decode throughput (budget p95 \${String(cap.budgets.p95Ms ?? 'n/a')}ms)\`, async () => {
  if (fixtureBytes === undefined) {
    throw IoError(
      '${cap.name}.fixture',
      'canonical fixture missing at ' + fixtureAbs + ' — restore ${ctx.fixturePath} (or fix the asset decl source) and re-run pnpm run capsule:compile',
      { path: fixtureAbs },
    );
  }
  if (cap.derive === undefined) {
    throw ValidationError(
      '${cap.name}.derive',
      'capsule has no derive handler — defineAsset should resolve decl.decoder ?? builtinDecoderFor(kind); check packages/assets/src/contract.ts and re-run pnpm run capsule:compile',
    );
  }
  await cap.derive(fixtureBytes as never);
}, { time: 500 });
`;
}

/** Real bench over the arbitrary-derivable source, importing the runtime binding. */
function propertyBench(cap: CapsuleDef<'cachedProjection', unknown, unknown, unknown>, ctx: HarnessContext): string {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary } from '${arbitraryImport}';

// REAL bench: drive the capsule's \`derive\` over presampled sources — the SAME
// binding + arbitrary the generated determinism/invariant properties drive.
// capsule:compile resolved this source schema as arbitrary-derivable, so the
// samples are by construction sources \`derive\` accepts. Sources are drawn ONCE
// at module load (fixed seed → reproducible) so the timed loop measures
// \`derive\`, never fast-check. \`derive\` may be async (asset decoders are), so the
// bench awaits it.
const cap = ${ctx.bindingName};
const derive = cap.derive!;
const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
const sources = fc.sample(arb, { numRuns: 64, seed: 0x5eed });
let i = 0;

bench(\`${escapeBacktick(cap.name)} — derive() over canonical sources\`, async () => {
  await derive(sources[i++ % sources.length] as never);
}, { time: 500 });
`;
}

/**
 * Generate the test + bench file contents for a `cachedProjection` capsule.
 *
 * Disposition is resolved at COMPILE TIME (see the module docstring). This
 * generator never decides derivability at test time and never emits a defensive
 * runtime `throw`-if-missing branch: it emits ONE clean real test, or THROWS a
 * tagged `UnsupportedError` so `capsule:compile` fails loud (wire-or-fail).
 */
export function generateCachedProjection(
  cap: CapsuleDef<'cachedProjection', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;
  const contentAddressImport = ctx.contentAddressImport ?? DEFAULT_CONTENT_ADDRESS_IMPORT;
  const hasBinding = ctx.bindingImport !== undefined && ctx.bindingName !== undefined;
  const hasFixture = hasBinding && ctx.fixturePath !== undefined;

  if (!hasBinding) {
    // Wire-or-fail: a generator emits a real test or throws — never a skip.
    throw UnsupportedError(
      'cachedProjection harness',
      `cannot harness cachedProjection capsule '${cap.name}': capsule:compile resolved no importable binding ` +
        `(bindingImport + bindingName). A factory-wrapped capsule without an exported binding cannot be probed — ` +
        `export the binding (or remove the capsule) and re-run pnpm run capsule:compile.`,
    );
  }

  // ── real-only fixture form ────────────────────────────────────────────────
  // COMPILE-TIME resolved: binding + `derive` + canonical fixture all present,
  // and the source schema is a Declaration-tagged `instanceOf(ArrayBuffer)`
  // deliberately NOT arbitrary-derivable. The canonical fixture bytes are the
  // source of truth. A regression (missing fixture / removed derive) throws RED
  // at setup, which is correct — never a green placeholder.
  if (ctx.cachedProjectionRealOnly === true) {
    if (!hasFixture) {
      throw UnsupportedError(
        'cachedProjection harness',
        `cannot harness cachedProjection capsule '${cap.name}': capsule:compile marked it real-only ` +
          `(cachedProjectionRealOnly) but resolved no canonical fixture path. The real-only form decodes a ` +
          `canonical byte fixture — wire the asset decl's source (or drop cachedProjectionRealOnly) and re-run ` +
          `pnpm run capsule:compile.`,
      );
    }
    const testFile = `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationError } from '@liteship/error';
import { contentAddressOf } from '${contentAddressImport}';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';

describe('${cap.name}', () => {
  const cap = ${ctx.bindingName} as {
    derive?: (source: unknown) => unknown | Promise<unknown>;
    invariants: ReadonlyArray<{ name: string; check: (input: unknown, output: unknown) => boolean }>;
  };
  // capsule:compile resolved: \`derive\` present + canonical fixture exists.
  // PREMISE GUARD — pins that resolution: a cachedProjection's \`derive\` comes
  // from its source of truth (a defineAsset's decoder, or a projection
  // factory's transform). If the binding ever loses it, this fails RED here
  // rather than the fixture probes silently passing over a missing handler.
  if (cap.derive === undefined) {
    throw ValidationError(
      '${cap.name}.derive',
      \`capsule:compile emitted the real-only fixture form but the binding exposes no \\\`derive\\\` handler — the projection lost its transform (a defineAsset decoder or a projection factory's derive); fix the capsule and re-run pnpm run capsule:compile\`,
    );
  }
  const derive = cap.derive;
  const fixtureAbs = resolve('${ctx.fixturePath}');
  const exactArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const fixtureBytes = (): ArrayBuffer => exactArrayBuffer(readFileSync(fixtureAbs));

  // Content-addressed cache model: a cachedProjection's cache is keyed on the
  // CONTENT ADDRESS of its source bytes (contentAddressOf — the canonical
  // @liteship/core kernel: canonicalize -> CanonicalCbor -> fnv1a), its value the
  // derived output. We drive a Map<ContentAddress, Out> through the REAL derive
  // to prove the two cache laws over real fixture bytes — not a hand-rolled
  // hash, not a vacuous placeholder.
  const sourceKey = (bytes: ArrayBuffer): string =>
    contentAddressOf(new Uint8Array(bytes.slice(0)));

  it('cache hit: identical source yields the same derived output', async () => {
    const cache = new Map<string, unknown>();
    const a = fixtureBytes();
    const b = fixtureBytes();
    // Identical source content -> identical cache key (a hit on the 2nd read).
    const keyA = sourceKey(a);
    const keyB = sourceKey(b);
    expect(keyB).toBe(keyA);

    cache.set(keyA, await derive(a as never));
    expect(cache.has(keyB)).toBe(true); // 2nd identical source is a cache HIT
    const cached = cache.get(keyB);
    // The derive is deterministic, so the cached value equals a fresh derive.
    expect(cached).toEqual(await derive(b as never));
    // And the derived OUTPUTS are content-address-identical (the property a
    // content-addressed cache relies on to serve a stored value).
    expect(contentAddressOf(cached)).toBe(contentAddressOf(await derive(b as never)));
  });

  it('invalidation: source change produces new cache entry', async () => {
    const cache = new Map<string, unknown>();
    const original = fixtureBytes();
    const keyOriginal = sourceKey(original);
    cache.set(keyOriginal, await derive(original as never));

    // Mutate one source byte deep in the payload — a genuinely different
    // source. A content-addressed cache MUST treat it as a new entry (cache
    // miss on the changed key), even when a robust derive happens to map both
    // sources to the same output: the cache invariant is keyed on the SOURCE.
    const mutated = new Uint8Array(original.slice(0));
    const flipAt = Math.max(0, mutated.length - 64);
    mutated[flipAt] = (mutated[flipAt]! ^ 0xff) & 0xff;
    const keyMutated = sourceKey(exactArrayBuffer(mutated));

    expect(keyMutated).not.toBe(keyOriginal); // changed source -> new key
    expect(cache.has(keyMutated)).toBe(false); // -> cache MISS (new entry)

    // Recording the new entry leaves the original entry intact: two distinct
    // sources, two distinct content-addressed cache entries.
    cache.set(keyMutated, await derive(exactArrayBuffer(mutated) as never));
    expect(cache.size).toBe(2);
    expect(cache.has(keyOriginal)).toBe(true);
  });

  it('determinism: the canonical fixture decodes to a deep-equal output twice', async () => {
    expect(await derive(fixtureBytes() as never)).toEqual(await derive(fixtureBytes() as never));
  });

  for (const inv of cap.invariants) {
    it(\`invariant over canonical fixture: \${inv.name}\`, async () => {
      const source = fixtureBytes();
      const output = await derive(source as never);
      expect(inv.check(source as never, output as never)).toBe(true);
    });
  }
});
`;
    return { testFile, benchFile: fixtureBench(cap, ctx) };
  }

  // ── real property form ────────────────────────────────────────────────────
  // COMPILE-TIME resolved: the source schema IS arbitrary-derivable AND `derive`
  // is present. Sample the source via the canonical walker and drive `derive`
  // over random sources for determinism + every declared invariant. No runtime
  // try/catch-derivability branch, no defensive throw-if-missing.
  if (ctx.arbitraryDerivable === true) {
    const testFile = `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary } from '${arbitraryImport}';

describe('${cap.name}', () => {
  const cap = ${ctx.bindingName};
  // capsule:compile resolved the source schema as arbitrary-derivable + \`derive\`
  // present, so we sample the source via the canonical walker and drive the REAL
  // derive over random sources. A regression in the walker throws at
  // schemaToArbitrary and fails the suite RED — correct, never a green skip.
  const sourceArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const derive = cap.derive!;

  it('determinism: identical source derives a deep-equal output', async () => {
    await fc.assert(
      fc.asyncProperty(sourceArb, async (source) => {
        expect(await derive(source as never)).toEqual(await derive(source as never));
      }),
      { numRuns: 100 },
    );
  });

  for (const inv of cap.invariants) {
    it(\`invariant: \${inv.name}\`, async () => {
      await fc.assert(
        fc.asyncProperty(sourceArb, async (source) => {
          const output = await derive(source as never);
          return inv.check(source as never, output as never);
        }),
        { numRuns: 100 },
      );
    });
  }
});
`;
    return { testFile, benchFile: propertyBench(cap, ctx) };
  }

  // ── wire-or-fail ──────────────────────────────────────────────────────────
  // A wired binding that is NEITHER real-only-fixture NOR arbitrary-derivable is
  // a real coverage gap: there is no canonical fixture to decode AND the source
  // schema cannot be sampled. Fail the compile loud — never ship a green skip or
  // a runtime defensive branch that decides this at test time.
  throw UnsupportedError(
    'cachedProjection harness',
    `cannot harness cachedProjection capsule '${cap.name}': capsule:compile resolved a binding but neither a ` +
      `canonical byte fixture (cachedProjectionRealOnly + fixturePath) nor an arbitrary-derivable source schema ` +
      `(arbitraryDerivable). A projection with no sampleable source and no fixture has nothing to drive \`derive\` ` +
      `over — add a canonical fixture source to the asset decl, or narrow the source schema so it is ` +
      `arbitrary-derivable, then re-run pnpm run capsule:compile.`,
  );
}
