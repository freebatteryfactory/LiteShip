/**
 * CUT A4 — proves @liteship/compiler and @liteship/astro consume the ONE shared
 * boundary-attribute predicate from @liteship/core (not two same-shape copies):
 *
 *   - behavioral parity: across a key matrix, ARIACompiler (compiler) and
 *     normalizeBoundaryState (astro) keep exactly the keys
 *     `BoundaryAttribute.isAllowedKey` allows;
 *   - single source: neither consumer module still defines a local predicate,
 *     and both import `BoundaryAttribute`.
 *
 * astro must NOT depend on @liteship/compiler — the shared law lives in core, which
 * both already depend on. normalizeBoundaryState is imported by direct path
 * (it is internal to the runtime boundary module, not re-exported).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BoundaryAttribute, defineBoundary } from '@liteship/core';
import { ARIACompiler } from '@liteship/compiler';
import { normalizeBoundaryState } from '../../packages/astro/src/runtime/boundary.js';

const REPO = resolve(import.meta.dirname, '..', '..');
// Non-empty keys exercised through both projection seams.
const KEYS = ['aria-label', 'aria-expanded', 'role', 'class', 'onclick', 'data-liteship-x', 'roles'] as const;
const attrs = Object.fromEntries(KEYS.map((k) => [k, 'x']));

describe('A4 — compiler + astro share the core BoundaryAttribute predicate', () => {
  it('ARIACompiler keeps exactly the keys core allows', () => {
    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'a'],
        [768, 'b'],
      ] as const,
    });
    const { currentAttributes } = ARIACompiler.compile(boundary, { a: attrs, b: {} }, 'a');
    for (const key of KEYS) {
      expect(key in currentAttributes, `compiler: ${key}`).toBe(BoundaryAttribute.isAllowedKey(key));
    }
  });

  it('astro normalizeBoundaryState keeps exactly the keys core allows', () => {
    const { aria } = normalizeBoundaryState({ aria: attrs });
    for (const key of KEYS) {
      expect(key in aria, `astro: ${key}`).toBe(BoundaryAttribute.isAllowedKey(key));
    }
  });

  it('neither consumer keeps a local copy of the predicate (single source in core)', () => {
    const ariaSrc = readFileSync(resolve(REPO, 'packages/compiler/src/aria.ts'), 'utf8');
    const boundarySrc = readFileSync(resolve(REPO, 'packages/astro/src/runtime/boundary.ts'), 'utf8');
    expect(ariaSrc, 'compiler aria.ts must not redefine the predicate').not.toMatch(/function\s+isValidAriaKey/);
    expect(boundarySrc, 'astro boundary.ts must not redefine the predicate').not.toMatch(
      /function\s+isAllowedBoundaryAttribute/,
    );
    expect(ariaSrc).toContain('BoundaryAttribute');
    expect(boundarySrc).toContain('BoundaryAttribute');
  });
});
