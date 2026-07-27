import { describe, expect, test } from 'vitest';
import { defineBoundary } from '@liteship/core';
import type { BoundaryManifest } from '@liteship/edge';
import { createBoundaryHMRPayloads } from '../../../packages/vite/src/hmr-producer.js';

const output = { css: '.x{}', propertyRegistrations: '', containerQueries: '' };

function manifest(id: string, css = '.x{}'): BoundaryManifest[string] {
  return {
    id: id as BoundaryManifest[string]['id'],
    outputs: [{ ...output, css }],
    outputsByTier: { 'transitions:standard': 0 },
  };
}

describe('boundary HMR producer', () => {
  test('diffs admitted manifests into deterministic canonical payloads', () => {
    const alpha = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [900, 'wide'],
      ],
    });
    const zeta = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'small'],
        [1200, 'large'],
      ],
    });
    const current = { zeta: manifest(zeta.id, '.z{}'), alpha: manifest(alpha.id, '.a{}') };
    const previous = { zeta: manifest('fnv1a:11111111'), alpha: manifest('fnv1a:22222222') };
    const definitions = new Map([
      ['zeta', { primitive: zeta, source: 'zeta.boundaries.ts' }],
      ['alpha', { primitive: alpha, source: 'alpha.boundaries.ts' }],
    ]);

    const projected = createBoundaryHMRPayloads(previous, current, definitions);
    expect(projected.map((entry) => entry.boundaryName)).toEqual(['alpha', 'zeta']);
    expect(projected[0]).toMatchObject({
      previousBoundaryId: 'fnv1a:22222222',
      boundary: { id: alpha.id },
      manifest: { id: alpha.id },
    });
    expect(Object.isFrozen(projected)).toBe(true);
  });

  test('does not invent live targets for unchanged, new, or deleted exports', () => {
    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [900, 'wide'],
      ],
    });
    const same = manifest(boundary.id);
    expect(createBoundaryHMRPayloads({ hero: same }, { hero: same }, new Map())).toEqual([]);
    expect(
      createBoundaryHMRPayloads({}, { hero: same }, new Map([['hero', { primitive: boundary, source: 'x' }]])),
    ).toEqual([]);
    expect(createBoundaryHMRPayloads({ hero: same }, {}, new Map())).toEqual([]);
  });

  test('refuses definition/manifest identity drift', () => {
    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [900, 'wide'],
      ],
    });
    const project = (): void => {
      createBoundaryHMRPayloads(
        { hero: manifest('fnv1a:11111111') },
        { hero: manifest('fnv1a:99999999', '.changed{}') },
        new Map([['hero', { primitive: boundary, source: 'hero.boundaries.ts' }]]),
      );
    };
    expect(project).toThrow(/identity drift/);
    try {
      project();
    } catch (error) {
      expect(error).toMatchObject({
        _tag: 'InvariantViolationError',
        invariant: 'vite.hmr-boundary-identity',
      });
    }
  });
});
