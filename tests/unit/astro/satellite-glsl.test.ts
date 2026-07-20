// @vitest-environment jsdom
/**
 * Authored GLSL cast reader chain (D1-GLSL): serialize → parse → apply LIVE.
 *
 * Proves the "authored GLSL → live uniform update on crossing" data path end to
 * end — `satelliteAttrs` folds authored per-state `glslStateUniforms` onto the
 * boundary payload; `parseBoundary` reads them back; `applyBoundaryState`
 * resolves `glslStateUniforms[currentState]` into `detail.glsl` and dispatches
 * `liteship:uniform-update` so the GPU runtime updates `u_*` uniforms on every
 * crossing (NOT frozen at the SSR'd initial state).
 *
 * The GLSL analog of `satellite-aria.test.ts`.
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { defineBoundary } from '@liteship/core';
import { satelliteAttrs } from '@liteship/astro';
import { applyBoundaryState, parseBoundary } from '../../../packages/astro/src/runtime/boundary.js';

const boundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'collapsed'],
    [768, 'expanded'],
  ],
});

// Per-state authored `@glsl { u_blur: …; }` uniform values, keyed by state then
// canonical `u_*` uniform name (the shape boundary-manifest emits via the
// GLSLCompiler `stateUniforms` map).
const glsl = {
  collapsed: { u_blur: 1, u_state: 0 },
  expanded: { u_blur: 0, u_state: 1 },
} as const;

describe('authored GLSL: serialize → parse → apply', () => {
  test('satelliteAttrs serializes glslStateUniforms onto the boundary payload', () => {
    const attrs = satelliteAttrs({ boundary, glsl });
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as { glslStateUniforms?: unknown };
    expect(payload.glslStateUniforms).toEqual(glsl);
  });

  test('parseBoundary reads glslStateUniforms back into the RuntimeBoundary', () => {
    const attrs = satelliteAttrs({ boundary, glsl });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!);
    expect(runtime?.glslStateUniforms).toEqual(glsl);
  });

  test('applyBoundaryState resolves authored GLSL for the LIVE state into detail.glsl', () => {
    const attrs = satelliteAttrs({ boundary, glsl });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    const el = document.createElement('div');

    const seen: Array<Record<string, number>> = [];
    el.addEventListener('liteship:uniform-update', (e) => {
      seen.push((e as CustomEvent<{ glsl: Record<string, number> }>).detail.glsl);
    });

    // Cross into 'expanded' → its authored u_blur:0 / u_state:1 must reach the event.
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'expanded' } }, 'liteship:state');
    expect(seen.at(-1)).toMatchObject({ u_blur: 0, u_state: 1 });

    // Cross back into 'collapsed' → uniforms update LIVE (not frozen).
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'collapsed' } }, 'liteship:state');
    expect(seen.at(-1)).toMatchObject({ u_blur: 1, u_state: 0 });
  });

  test('authored GLSL composes over the compositor live u_state index', () => {
    const attrs = satelliteAttrs({ boundary, glsl });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    const el = document.createElement('div');
    let detailGlsl: Record<string, number> | undefined;
    el.addEventListener('liteship:uniform-update', (e) => {
      detailGlsl = (e as CustomEvent<{ glsl: Record<string, number> }>).detail.glsl;
    });

    // The compositor's live emit carries a u_state index via `outputs.glsl`;
    // authored per-state uniforms compose ON TOP of it (authored wins on overlap).
    applyBoundaryState(
      el,
      runtime,
      { discrete: { [runtime.name]: 'expanded' }, outputs: { glsl: { u_state: 99 } } },
      'liteship:state',
    );
    // authored u_state:1 overrides the stray compositor 99; u_blur rides through.
    expect(detailGlsl).toMatchObject({ u_blur: 0, u_state: 1 });
  });

  test('a boundary with no authored GLSL is unaffected (no glslStateUniforms)', () => {
    const attrs = satelliteAttrs({ boundary });
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as { glslStateUniforms?: unknown };
    expect(payload.glslStateUniforms).toBeUndefined();
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    expect(runtime.glslStateUniforms).toBeUndefined();

    const el = document.createElement('div');
    let detailGlsl: Record<string, number> | undefined;
    el.addEventListener('liteship:uniform-update', (e) => {
      detailGlsl = (e as CustomEvent<{ glsl: Record<string, number> }>).detail.glsl;
    });
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'expanded' } }, 'liteship:state');
    // No authored uniforms → detail.glsl is the (empty) normalized map, no throw.
    expect(detailGlsl).toEqual({});
  });
});
