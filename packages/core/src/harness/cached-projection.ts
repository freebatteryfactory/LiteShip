/**
 * Harness template for the `cachedProjection` assembly arm.
 *
 * With a {@link HarnessContext} the generated test imports the REAL capsule
 * binding and probes its `derive(source)` handler at runtime: determinism
 * (the same source derives a deep-equal output twice — the property a
 * content-addressed cache is allowed to rely on) and every declared
 * invariant under random sources. `derive` may be async (asset decoders
 * are), so every probe is awaited. When `derive` is absent — or the input
 * schema is not arbitrary-derivable — the test self-reports as `it.skip`
 * rather than a vacuous placeholder.
 *
 * When the context also carries a `fixturePath` (an asset decl's canonical
 * `source` file), the harness additionally emits fixture-based determinism
 * and invariant tests, and the bench file becomes a REAL decode-throughput
 * bench over the fixture bytes instead of a comment-only placeholder.
 *
 * @module
 */

import type { CapsuleDef } from '../assembly.js';
import type { HarnessContext, HarnessOutput } from './pure-transform.js';

const DEFAULT_ARBITRARY_IMPORT = '../../packages/core/src/harness/arbitrary-from-schema.js';
const DEFAULT_CONTENT_ADDRESS_IMPORT = '../../packages/core/src/content-address.js';

/** Comment-only bench placeholder used when no binding/fixture is wired. */
function placeholderBench(cap: CapsuleDef<'cachedProjection', unknown, unknown, unknown>): string {
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';

bench('${cap.name} — decode throughput', () => {
  // decode a canonical source, measure p95 vs budget (${cap.budgets.p95Ms ?? 'n/a'}ms)
}, { time: 500 });
`;
}

/** Real decode bench over the canonical fixture, importing the runtime binding. */
function fixtureBench(cap: CapsuleDef<'cachedProjection', unknown, unknown, unknown>, ctx: HarnessContext): string {
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';

const cap = ${ctx.bindingName};
const fixtureAbs = resolve('${ctx.fixturePath}');
const fixtureBytes = existsSync(fixtureAbs) ? (readFileSync(fixtureAbs).buffer as ArrayBuffer) : undefined;

bench(\`${cap.name} — decode throughput (budget p95 \${String(cap.budgets.p95Ms ?? 'n/a')}ms)\`, async () => {
  if (fixtureBytes === undefined) {
    throw new Error(
      '${cap.name}: canonical fixture missing at ' + fixtureAbs + ' — restore ${ctx.fixturePath} (or fix the asset decl source) and re-run pnpm run capsule:compile',
    );
  }
  if (cap.derive === undefined) {
    throw new Error(
      '${cap.name}: capsule has no derive handler — defineAsset should resolve decl.decoder ?? builtinDecoderFor(kind); check packages/assets/src/contract.ts and re-run pnpm run capsule:compile',
    );
  }
  await cap.derive(fixtureBytes as never);
}, { time: 500 });
`;
}

/**
 * Generate the test + bench file contents for a `cachedProjection` capsule.
 * Without a binding context, emits `it.skip` placeholders naming the
 * missing wiring (factory-wrapped capsules without an exported binding
 * have nothing importable to probe).
 */
export function generateCachedProjection(
  cap: CapsuleDef<'cachedProjection', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;
  const contentAddressImport = ctx.contentAddressImport ?? DEFAULT_CONTENT_ADDRESS_IMPORT;
  const hasBinding = ctx.bindingImport !== undefined && ctx.bindingName !== undefined;
  const hasFixture = hasBinding && ctx.fixturePath !== undefined;

  const benchFile = hasFixture ? fixtureBench(cap, ctx) : placeholderBench(cap);

  // COMPILE-TIME resolved: binding + `derive` + canonical fixture all present.
  // Emit the FINAL real-only form — fixture-driven cache-hit / invalidation /
  // determinism / invariant probes with NO `it.skip` token. The random-source
  // property test is OMITTED (not skipped): the source schema is a
  // Declaration-tagged `instanceOf(ArrayBuffer)` that is deliberately not
  // arbitrary-derivable, so the canonical fixture bytes are the source of
  // truth. A regression (missing fixture / removed derive) throws RED at
  // setup, which is correct — never a green placeholder.
  if (ctx.cachedProjectionRealOnly === true && hasFixture) {
    const testFile = `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    throw new Error(
      \`${cap.name}: capsule:compile emitted the real-only fixture form but the binding exposes no \\\`derive\\\` handler — the projection lost its transform (a defineAsset decoder or a projection factory's derive); fix the capsule and re-run pnpm run capsule:compile\`,
    );
  }
  const derive = cap.derive;
  const fixtureAbs = resolve('${ctx.fixturePath}');
  const fixtureBytes = (): ArrayBuffer => readFileSync(fixtureAbs).buffer as ArrayBuffer;

  // Content-addressed cache model: a cachedProjection's cache is keyed on the
  // CONTENT ADDRESS of its source bytes (contentAddressOf — the canonical
  // @czap/core kernel: canonicalize -> CanonicalCbor -> fnv1a), its value the
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
    const keyMutated = sourceKey(mutated.buffer as ArrayBuffer);

    expect(keyMutated).not.toBe(keyOriginal); // changed source -> new key
    expect(cache.has(keyMutated)).toBe(false); // -> cache MISS (new entry)

    // Recording the new entry leaves the original entry intact: two distinct
    // sources, two distinct content-addressed cache entries.
    cache.set(keyMutated, await derive(mutated.buffer as never));
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
    return { testFile, benchFile };
  }

  if (!hasBinding) {
    const testFile = `// GENERATED — do not edit by hand
import { describe, it } from 'vitest';

describe('${cap.name}', () => {
  it.skip('cache hit: identical source yields the same derived output', () => {
    // TODO(harness): no capsule binding import wired by capsule-compile.
    // Factory-wrapped capsules without an exported binding can't be probed.
  });

  it.skip('invalidation: source change produces new cache entry', () => {
    // TODO(harness): same — no binding wired.
  });
});
`;
    return { testFile, benchFile };
  }

  const fixtureSection = !hasFixture
    ? ''
    : `
  // Canonical-fixture probes — real bytes through the real decoder.
  const fixtureAbs = resolve('${ctx.fixturePath}');
  if (cap.derive === undefined || !existsSync(fixtureAbs)) {
    it.skip(
      cap.derive === undefined
        ? 'canonical fixture decode — capsule has no derive handler'
        : \`canonical fixture decode — fixture missing at \${fixtureAbs} (restore ${ctx.fixturePath} and re-run pnpm run capsule:compile)\`,
      () => {},
    );
  } else {
    const derive = cap.derive!;
    const fixtureBytes = (): ArrayBuffer => readFileSync(fixtureAbs).buffer as ArrayBuffer;

    // Content-addressed cache model: a cachedProjection's cache is keyed on
    // the CONTENT ADDRESS of its source bytes (contentAddressOf — the
    // canonical @czap/core kernel: canonicalize -> CanonicalCbor -> fnv1a),
    // its value the derived output. We drive a Map<ContentAddress, Out>
    // through the REAL derive to prove the two cache laws over real fixture
    // bytes — not a hand-rolled hash, not a vacuous placeholder.
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
      const hit = cache.has(keyB);
      expect(hit).toBe(true); // 2nd identical source is a cache HIT
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
      const keyMutated = sourceKey(mutated.buffer as ArrayBuffer);

      expect(keyMutated).not.toBe(keyOriginal); // changed source -> new key
      expect(cache.has(keyMutated)).toBe(false); // -> cache MISS (new entry)

      // Recording the new entry leaves the original entry intact: two distinct
      // sources, two distinct content-addressed cache entries.
      cache.set(keyMutated, await derive(mutated.buffer as never));
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
  }
`;

  const fsImports = !hasFixture
    ? ''
    : `import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contentAddressOf } from '${contentAddressImport}';
`;

  const testFile = `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
${fsImports}import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary, UnsupportedSchemaError } from '${arbitraryImport}';

describe('${cap.name}', () => {
  const cap = ${ctx.bindingName};
  let sourceArb: fc.Arbitrary<unknown>;
  let arbError: unknown;
  try {
    sourceArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  } catch (err) {
    arbError = err;
  }
  if (arbError !== undefined && !(arbError instanceof UnsupportedSchemaError)) {
    // Only a non-derivable schema is honest-skip material; anything else
    // (a defect in the arbitrary builder, a malformed capsule) must fail.
    throw arbError;
  }
  if (cap.derive === undefined || arbError !== undefined) {
    it.skip(
      arbError instanceof UnsupportedSchemaError
        ? \`projection — input schema not arbitrary-derivable (\${arbError.message})\`
        : 'projection — capsule has no derive handler',
      () => {},
    );
  } else {
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
  }
${fixtureSection}});
`;

  return { testFile, benchFile };
}
