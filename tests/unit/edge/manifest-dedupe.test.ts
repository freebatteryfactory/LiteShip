/**
 * Boundary manifest dedupe golden tests.
 *
 * The (motion x design) tier grid has ~20 cells, but a boundary's
 * compiled CSS is mostly tier-invariant -- the pre-dedupe format
 * serialized the same strings once PER CELL. The v2 entry shape pools
 * the distinct `CompiledOutputs` and stores pool indices per cell.
 * These tests pin the two laws of that format: the reader inflates to
 * byte-identical per-tier outputs, and the serialized entry is strictly
 * smaller whenever cells share tier-invariant CSS.
 */

import { describe, expect, test } from 'vitest';
import {
  DESIGN_TIERS,
  MOTION_TIERS,
  dedupeOutputsByTier,
  enumerateTierKeys,
  resolveAssetUrlByTier,
  resolveOutputsByTier,
  tierKey,
} from '@czap/edge';
import type { CompiledOutputs, TierKey } from '@czap/edge';

/**
 * Representative pre-dedupe map, shaped exactly like the build produces:
 * tier-invariant container queries, with `@property` registrations
 * dropped on the `none` motion tier (reduced motion) -- two distinct
 * outputs spread across the full 20-cell grid.
 */
function makePreDedupeGrid(): Readonly<Partial<Record<TierKey, CompiledOutputs>>> {
  const containerQueries =
    ':root { container-type: inline-size; container-name: viewport-width; }\n\n' +
    '@container viewport-width (width >= 768px) { .czap-boundary { --gap: 24px; } }';
  const propertyRegistrations = '@property --gap { syntax: "<length>"; inherits: false; initial-value: 8px; }';
  const byTier: Partial<Record<TierKey, CompiledOutputs>> = {};
  for (const motionTier of MOTION_TIERS) {
    const registrations = motionTier === 'none' ? '' : propertyRegistrations;
    const css = [registrations, containerQueries].filter((part) => part.length > 0).join('\n\n');
    const outputs: CompiledOutputs = { css, propertyRegistrations: registrations, containerQueries };
    for (const designTier of DESIGN_TIERS) {
      byTier[tierKey({ motionTier, designTier })] = outputs;
    }
  }
  return byTier;
}

describe('manifest tier-grid dedupe', () => {
  test('resolve(dedupe(grid)) returns byte-identical outputs for every tier cell', () => {
    const grid = makePreDedupeGrid();
    const resolved = resolveOutputsByTier(dedupeOutputsByTier(grid));

    expect(Object.keys(resolved).sort()).toEqual([...enumerateTierKeys()].sort());
    for (const key of enumerateTierKeys()) {
      // Byte identity per field -- the host adapter must serve the exact
      // CSS the build compiled, dedupe or not.
      expect(resolved[key]!.css).toBe(grid[key]!.css);
      expect(resolved[key]!.propertyRegistrations).toBe(grid[key]!.propertyRegistrations);
      expect(resolved[key]!.containerQueries).toBe(grid[key]!.containerQueries);
    }
  });

  test('pool holds only the DISTINCT outputs and the serialized entry strictly shrinks', () => {
    const grid = makePreDedupeGrid();
    const deduped = dedupeOutputsByTier(grid);

    // Two distinct outputs: motion `none` (no registrations) vs the rest.
    expect(deduped.outputs).toHaveLength(2);
    expect(Object.keys(deduped.outputsByTier)).toHaveLength(enumerateTierKeys().length);

    const preDedupeBytes = JSON.stringify({ outputsByTier: grid }).length;
    const dedupedBytes = JSON.stringify(deduped).length;
    expect(dedupedBytes).toBeLessThan(preDedupeBytes);
  });

  test('dedupe pools by content, so a producer that allocates per cell still dedupes', () => {
    const grid = makePreDedupeGrid();
    // Fresh object per cell (same bytes) -- reference identity must not matter.
    const cloned = Object.fromEntries(
      Object.entries(grid).map(([key, outputs]) => [key, { ...outputs }]),
    ) as Partial<Record<TierKey, CompiledOutputs>>;

    expect(dedupeOutputsByTier(cloned).outputs).toHaveLength(2);
  });

  test('pool order is canonical grid order regardless of producer insertion order', () => {
    const grid = makePreDedupeGrid();
    const reversed = Object.fromEntries(Object.entries(grid).reverse()) as Partial<Record<TierKey, CompiledOutputs>>;

    expect(dedupeOutputsByTier(reversed)).toEqual(dedupeOutputsByTier(grid));
  });

  test('resolving a cell that points outside the pool fails fast with a teaching error', () => {
    expect(() =>
      resolveOutputsByTier({ outputs: [], outputsByTier: { 'transitions:standard': 0 } }),
    ).toThrowError(/outputs\[0\].*0 item\(s\).*rebuild/s);
  });

  test('resolving a pre-v2 entry (CompiledOutputs object in a cell) teaches the rebuild fix', () => {
    const legacy = {
      outputs: [],
      outputsByTier: {
        'transitions:standard': { css: 'x', propertyRegistrations: '', containerQueries: 'x' },
      },
    } as unknown as Parameters<typeof resolveOutputsByTier>[0];

    expect(() => resolveOutputsByTier(legacy)).toThrowError(/_version: 2/);
  });

  test('a true v1 entry (no outputs pool at all) gets the rebuild teaching error, not a TypeError', () => {
    // A previously-emitted v1 czap-boundary-manifest.json entry has NO
    // `outputs` field — the error template itself must not dereference the
    // missing pool while explaining the problem.
    const v1 = {
      outputsByTier: {
        'transitions:standard': { css: 'x', propertyRegistrations: '', containerQueries: 'x' },
      },
    } as unknown as Parameters<typeof resolveOutputsByTier>[0];

    expect(() => resolveOutputsByTier(v1)).toThrowError(/_version: 2/);
  });

  test('resolveAssetUrlByTier maps tier to pool index to immutable URL', () => {
    const entry = {
      ...dedupeOutputsByTier(makePreDedupeGrid()),
      assetUrls: {
        0: '/_czap/f6a7/0.abcd.css',
        1: '/_czap/f6a7/1.ef01.css',
      },
    };

    expect(resolveAssetUrlByTier(entry, 'none:standard')).toBe('/_czap/f6a7/0.abcd.css');
    expect(resolveAssetUrlByTier(entry, 'transitions:standard')).toBe('/_czap/f6a7/1.ef01.css');
  });

  test('resolveAssetUrlByTier returns undefined when manifest has no asset URLs', () => {
    const entry = dedupeOutputsByTier(makePreDedupeGrid());
    expect(resolveAssetUrlByTier(entry, 'transitions:standard')).toBeUndefined();
  });
});
