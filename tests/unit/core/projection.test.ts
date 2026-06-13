/**
 * Projection vocabulary — one home for per-quantizer output key naming, and the
 * worker-blob twin must agree with it on every name (the P0 anti-drift pattern,
 * applied to the projection vocabulary).
 *
 * Also locks the Layer-1 bug fix: `glslKey` must be a *valid GLSL identifier*
 * (hyphens → underscores, camelCase → snake) matching the GLSL compiler's
 * `toUniformName` — the old hand-inlined `u_${name}` left hyphens in.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { projectionKeys, glslIdent, PROJECTION_KEYS_SOURCE } from '@czap/core';

/** Execute the worker-blob source exactly as the worker does. */
const blobProjectionKeys = new Function(
  'name',
  `${PROJECTION_KEYS_SOURCE}\nreturn projectionKeys(name);`,
) as (name: string) => { cssKey: string; glslKey: string; ariaKey: string };

describe('projectionKeys', () => {
  it('mints css/aria keys with the name verbatim, glsl as a u_ identifier', () => {
    expect(projectionKeys('hero')).toEqual({
      cssKey: '--czap-hero',
      glslKey: 'u_hero',
      ariaKey: 'data-czap-hero',
    });
  });

  it('glslKey hyphen-sanitizes — the Layer-1 bug fix (u_${name} left invalid hyphens)', () => {
    expect(projectionKeys('my-thing').glslKey).toBe('u_my_thing');
    expect(glslIdent('my-thing')).toBe('u_my_thing');
  });

  it('glslKey folds camelCase to snake_case, matching the GLSL compiler', () => {
    expect(projectionKeys('heroImage').glslKey).toBe('u_hero_image');
    expect(projectionKeys('fooBarBaz').glslKey).toBe('u_foo_bar_baz');
  });

  it('css/aria keys preserve case (custom properties + data attributes are case-sensitive)', () => {
    expect(projectionKeys('heroImage').cssKey).toBe('--czap-heroImage');
    expect(projectionKeys('heroImage').ariaKey).toBe('data-czap-heroImage');
  });
});

describe('PROJECTION_KEYS_SOURCE (worker-blob twin) agrees with projectionKeys', () => {
  const NAMES = ['hero', 'my-thing', 'heroImage', 'a-b-c', 'fooBarBaz', 'x', 'Section2', 'kebab-case-long'];
  for (const name of NAMES) {
    it(`agrees for "${name}"`, () => {
      expect(blobProjectionKeys(name)).toEqual(projectionKeys(name));
    });
  }
});
