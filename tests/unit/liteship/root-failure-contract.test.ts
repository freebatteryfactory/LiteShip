// @vitest-environment node
/** Root-facade negative controls for the immutable authoring contract. */

import { describe, expect, it } from 'vitest';
import { hasTag } from '@liteship/error';
import { defineAdaptive, defineBoundary, defineConfig, defineStyle } from '../../../packages/liteship/src/index.js';

interface ValidationTuple {
  readonly tag: string;
  readonly module: string;
  readonly detail: string;
}

function captureValidation(run: () => unknown): ValidationTuple {
  try {
    run();
    expect.unreachable('expected a tagged validation failure');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(hasTag(error, 'ValidationError')).toBe(true);
    const tagged = error as Error & { readonly _tag: string; readonly module: string; readonly detail: string };
    expect(tagged.detail.length).toBeGreaterThan(0);
    expect(tagged.detail.length).toBeLessThanOrEqual(2_000);
    return { tag: tagged._tag, module: tagged.module, detail: tagged.detail };
  }
}

const boundary = () =>
  defineBoundary({
    input: 'viewport.width',
    at: [
      [0, 'small'],
      [640, 'large'],
    ],
  });
const style = () => defineStyle({ boundary: boundary(), base: { properties: { display: 'grid' } } });
const adaptive = () =>
  defineAdaptive({
    boundary: {
      input: 'viewport.width',
      at: [
        [0, 'small'],
        [640, 'large'],
      ],
    },
    style: { base: { properties: { display: 'grid' } } },
  });

describe('liteship root failure contract', () => {
  it.each([
    {
      name: 'Boundary rejects nonascending thresholds',
      run: () =>
        defineBoundary({
          input: 'viewport.width',
          at: [
            [640, 'large'],
            [0, 'small'],
          ],
        }),
      module: 'defineBoundary',
      remedy: /Reorder|increase/u,
      valid: boundary,
    },
    {
      name: 'Boundary rejects an empty partition',
      run: () => defineBoundary({ input: 'viewport.width', at: [] } as never),
      module: 'defineBoundary',
      remedy: /at least one|\[threshold, state\]/u,
      valid: boundary,
    },
    {
      name: 'Style rejects a state outside its boundary',
      run: () =>
        defineStyle({ boundary: boundary(), base: { properties: {} }, states: { ghost: { properties: {} } } } as never),
      module: 'defineStyle',
      remedy: /match boundary states/u,
      valid: style,
    },
    {
      name: 'Style rejects a missing base layer',
      run: () => defineStyle({} as never),
      module: 'defineStyle',
      remedy: /missing required field|base/u,
      valid: style,
    },
    {
      name: 'Config rejects null instead of raw-throwing',
      run: () => defineConfig(null as never),
      module: 'defineConfig',
      remedy: /plain object|authoring record/u,
      valid: () => defineConfig({}),
    },
    {
      name: 'Config rejects unknown top-level fields',
      run: () => defineConfig({ mystery: true } as never),
      module: 'defineConfig',
      remedy: /Remove unsupported fields/u,
      valid: () => defineConfig({ astro: { adaptive: true } }),
    },
    {
      name: 'Adaptive preserves an invalid nested Boundary failure',
      run: () =>
        defineAdaptive({
          boundary: { input: 'viewport.width', at: [] },
          style: { base: { properties: {} } },
        } as never),
      module: 'defineBoundary',
      remedy: /at least one|\[threshold, state\]/u,
      valid: adaptive,
    },
    {
      name: 'Adaptive rejects a foreign capability tier',
      run: () =>
        defineAdaptive({
          boundary: { input: 'viewport.width', at: [[0, 'small']] },
          style: { base: { properties: {} } },
          tier: 'ghost',
        } as never),
      module: 'defineAdaptive',
      remedy: /static.*styled.*reactive.*animated.*gpu/u,
      valid: adaptive,
    },
  ])('$name', ({ run, module, remedy, valid }) => {
    const error = captureValidation(run);
    expect(error.tag).toBe('ValidationError');
    expect(error.module).toBe(module);
    expect(error.detail).toMatch(remedy);
    expect(valid()).toBeDefined();
  });

  it('does not reinterpret the nested Boundary error at the facade composition root', () => {
    const badBoundary = { input: 'viewport.width', at: [] } as never;
    const direct = captureValidation(() => defineBoundary(badBoundary));
    const adaptiveError = captureValidation(() =>
      defineAdaptive({ boundary: badBoundary, style: { base: { properties: {} } } } as never),
    );
    expect(adaptiveError).toEqual(direct);
  });
});
