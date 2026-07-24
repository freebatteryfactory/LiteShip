/**
 * Verifies the type-directed capsule detector finds both direct
 * defineCapsule calls and factory-wrapped capsule calls.
 *
 * Batches every file that needs `detectCapsuleCalls` into one
 * `ts.createProgram` in `beforeAll` — each `it` used to pay the full
 * checker cold-start (~15–25s+ under coverage); one program cuts wall
 * time roughly to a single startup.
 *
 * @module
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scaledTimeout } from '../../vitest.shared.js';
import { resolve } from 'node:path';
import {
  detectCapsuleCalls,
  WORKSPACE_ALIASES,
  FACTORY_HINTS,
  FACTORY_NAMING,
} from '../../scripts/lib/capsule-detector.js';
import { Config, defineConfig } from '@liteship/core';

const CANONICAL_CBOR = resolve('packages/core/src/authoring/capsules/canonical-cbor.ts');
const ASSETS_SCENE = resolve('examples/scenes/assets.ts');
const BEAT_MARKERS = resolve('packages/assets/src/analysis/beat-markers.ts');
const EXPORT_LIST_FIXTURE = resolve('tests/fixtures/capsules/export-list-asset.ts');

describe(
  'detectCapsuleCalls',
  { timeout: scaledTimeout(90_000), hookTimeout: scaledTimeout(90_000) },
  () => {
    let allCalls: ReturnType<typeof detectCapsuleCalls>;

    beforeAll(() => {
      allCalls = detectCapsuleCalls([
        CANONICAL_CBOR,
        ASSETS_SCENE,
        BEAT_MARKERS,
        EXPORT_LIST_FIXTURE,
      ]);
    });

    it('detects direct defineCapsule calls (pureTransform arm)', () => {
      const calls = allCalls.filter((c) => c.file === CANONICAL_CBOR);
      const match = calls.find((c) => c.name === 'core.canonical-cbor');
      expect(match).toBeDefined();
      expect(match?.kind).toBe('pureTransform');
      expect(match?.factory).toBeUndefined();
    });

    it('detects defineAsset factory calls in examples/scenes/assets.ts', () => {
      const calls = allCalls.filter((c) => c.file === ASSETS_SCENE);
      const assetCalls = calls.filter((c) => c.factory === 'defineAsset');
      expect(assetCalls.length).toBeGreaterThan(0);
      expect(assetCalls[0]!.kind).toBe('cachedProjection');
    });

    it('detects BeatMarkerProjection factory calls and extracts string literal args', () => {
      const calls = allCalls.filter((c) => c.file === ASSETS_SCENE);
      const beat = calls.find((c) => c.factory === 'BeatMarkerProjection');
      expect(beat).toBeDefined();
      expect(beat?.kind).toBe('cachedProjection');
      expect(beat?.args).toEqual(expect.arrayContaining(['intro-bed']));
      expect(beat?.name).toBe('intro-bed');
    });

    it('captures the exported binding and decl source for defineAsset call sites', () => {
      const calls = allCalls.filter((c) => c.file === ASSETS_SCENE);
      const introBed = calls.find((c) => c.factory === 'defineAsset' && c.name === 'intro-bed');
      expect(introBed?.binding).toBe('introBed');
      // `export const introBed = defineAsset({...})` — importable by the
      // generated harness test, so capsule-compile wires a HarnessContext.
      expect(introBed?.exported).toBe(true);
      // The decl's `source` is the canonical decode fixture for the harness.
      expect(introBed?.declSource).toBe('examples/scenes/intro-bed.wav');
    });

    it('records line numbers and absolute file paths', () => {
      const calls = allCalls.filter((c) => c.file === CANONICAL_CBOR);
      const match = calls.find((c) => c.name === 'core.canonical-cbor');
      expect(match?.file).toBe(CANONICAL_CBOR);
      expect(match?.line).toBeGreaterThan(0);
    });

    it('classifies export-list bindings as importable (const X = ...; export { X })', () => {
      const calls = allCalls.filter((c) => c.file === EXPORT_LIST_FIXTURE);
      const listed = calls.find((c) => c.name === 'fixture-list-exported');
      expect(listed).toBeDefined();
      expect(listed?.binding).toBe('listExported');
      expect(listed?.exported).toBe(true);
    });

    it('reports the EXPORTED name for aliased export-list bindings (export { x as y })', () => {
      const calls = allCalls.filter((c) => c.file === EXPORT_LIST_FIXTURE);
      const aliased = calls.find((c) => c.name === 'fixture-alias-exported');
      expect(aliased).toBeDefined();
      // `aliasLocal` is the local const; only `aliasExported` is importable.
      expect(aliased?.binding).toBe('aliasExported');
      expect(aliased?.exported).toBe(true);
    });

    it('keeps bindings absent from every export list non-exported', () => {
      const calls = allCalls.filter((c) => c.file === EXPORT_LIST_FIXTURE);
      const priv = calls.find((c) => c.name === 'fixture-never-exported');
      expect(priv).toBeDefined();
      expect(priv?.binding).toBe('neverExported');
      expect(priv?.exported).toBe(false);
    });

    it('dedupes nested defineCapsule calls inside factory bodies', () => {
      const calls = allCalls.filter((c) => c.file === BEAT_MARKERS);
      const lines = calls.map((c) => `${c.file}:${c.line}`);
      expect(new Set(lines).size).toBe(lines.length);
    });
  },
);

describe('capsule detector workspace aliases', () => {
  it('WORKSPACE_ALIASES is in sync with Config.toTestAliases (no drift)', () => {
    const canonical = Object.keys(Config.toTestAliases(defineConfig({}), process.cwd()));
    const detector = Object.keys(WORKSPACE_ALIASES);
    expect(new Set(detector)).toEqual(new Set(canonical));
  });
});

/**
 * FACTORY_HINTS single-owner pin (scar S1.5.2).
 *
 * The capsule pre-filter hint set used to be COPIED, hand-listed, inside
 * `tests/property/schema-strictness.prop.test.ts` while `scripts/capsule-compile.ts`
 * derived its own from FACTORY_NAMING — a fork that would silently drift the day a
 * new projection factory landed, quietly narrowing the strictness sweep. Both now
 * import the ONE {@link FACTORY_HINTS} from the detector lib. These pins freeze:
 *   1. the DERIVATION (hints = the two base factories + every FACTORY_NAMING key),
 *      so the list stays auto-generated, never re-hardcoded; and
 *   2. the canonical CONTENT, so adding/removing a factory forces a conscious,
 *      reviewable update here (red-proven by desyncing one FACTORY_NAMING entry).
 */
describe('FACTORY_HINTS — single owner of the capsule pre-filter (scar S1.5.2)', () => {
  it('is exactly the two base factories plus every FACTORY_NAMING key (derived, not hand-listed)', () => {
    expect([...FACTORY_HINTS]).toEqual(['defineCapsule', 'defineAsset', ...Object.keys(FACTORY_NAMING)]);
  });

  it('pins the canonical hint set — a factory added to / removed from FACTORY_NAMING must update this list', () => {
    expect([...FACTORY_HINTS]).toEqual([
      'defineCapsule',
      'defineAsset',
      'BeatMarkerProjection',
      'OnsetProjection',
      'WaveformProjection',
      'WavMetadataProjection',
    ]);
  });
});
