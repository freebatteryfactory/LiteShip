// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contentAddressOf } from '../../packages/core/src/content-address.js';
import { introBedMetadata } from '../../examples/scenes/assets.js';

describe('intro-bed:wav-metadata', () => {
  const cap = introBedMetadata as {
    derive?: (source: unknown) => unknown | Promise<unknown>;
    invariants: ReadonlyArray<{ name: string; check: (input: unknown, output: unknown) => boolean }>;
  };
  // capsule:compile resolved: `derive` present + canonical fixture exists.
  // PREMISE GUARD — pins that resolution: a cachedProjection's `derive` comes
  // from its source of truth (a defineAsset's decoder, or a projection
  // factory's transform). If the binding ever loses it, this fails RED here
  // rather than the fixture probes silently passing over a missing handler.
  if (cap.derive === undefined) {
    throw new Error(
      `intro-bed:wav-metadata: capsule:compile emitted the real-only fixture form but the binding exposes no \`derive\` handler — the projection lost its transform (a defineAsset decoder or a projection factory's derive); fix the capsule and re-run pnpm run capsule:compile`,
    );
  }
  const derive = cap.derive;
  const fixtureAbs = resolve('examples/scenes/intro-bed.wav');
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
    it(`invariant over canonical fixture: ${inv.name}`, async () => {
      const source = fixtureBytes();
      const output = await derive(source as never);
      expect(inv.check(source as never, output as never)).toBe(true);
    });
  }
});
