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
import { projectionKeys, glslIdent, wgslIdent, PROJECTION_KEYS_SOURCE } from '@liteship/core';

/** Execute the worker-blob source exactly as the worker does. */
const blobProjectionKeys = new Function(
  'name',
  `${PROJECTION_KEYS_SOURCE}\nreturn projectionKeys(name);`,
) as (name: string) => { cssKey: string; glslKey: string; wgslKey: string; ariaKey: string };

describe('projectionKeys', () => {
  it('mints css/aria keys with the name verbatim, glsl as u_<snake>, wgsl as bare <snake>', () => {
    expect(projectionKeys('hero')).toEqual({
      cssKey: '--liteship-hero',
      glslKey: 'u_hero',
      wgslKey: 'hero',
      ariaKey: 'data-liteship-hero',
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

  it('wgslKey is the bare snake fold (no u_ prefix), matching the WGSL compiler toFieldName', () => {
    expect(projectionKeys('blurRadius').wgslKey).toBe('blur_radius');
    expect(projectionKeys('my-thing').wgslKey).toBe('my_thing');
    expect(wgslIdent('heroImage')).toBe('hero_image');
    // glslKey === 'u_' + wgslKey for every name — the shared snake fold.
    for (const name of ['hero', 'blurRadius', 'a-b-c']) {
      expect(projectionKeys(name).glslKey).toBe(`u_${projectionKeys(name).wgslKey}`);
    }
  });

  it('css/aria keys preserve case (custom properties + data attributes are case-sensitive)', () => {
    expect(projectionKeys('heroImage').cssKey).toBe('--liteship-heroImage');
    expect(projectionKeys('heroImage').ariaKey).toBe('data-liteship-heroImage');
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
