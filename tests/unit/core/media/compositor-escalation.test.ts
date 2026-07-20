/**
 * Compositor escalation gate (E) -- chooseTier wired into the emit phase.
 *
 * Proves that a budget-constrained `PolicyNode` resolved via `getPolicy`
 * downgrades the tier and drops the targets that tier no longer admits (e.g. a
 * tight `budgets.p95Ms` strips `glsl`, leaving `css`/`aria`), that a permissive
 * policy admits all targets, that an absent policy is pass-through, and that the
 * `{ error }` branch (site not admitted) denies every target for that projection.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { Boundary, Compositor, Cap, sealNode, defineBoundary } from '@liteship/core';
import type { PolicyNode, RuntimeSite, CapTier, CapSet, CellMeta, ContentAddress } from '@liteship/core';

const widthBoundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

function makeQuantizer(boundary: Boundary, initialState?: string) {
  let currentState = initialState ?? (boundary.states[0] as string);
  return {
    boundary,
    stateSync: () => currentState,
    changes: null as never,
    evaluate(value: number) {
      currentState = Boundary.evaluate(boundary, value) as string;
      return currentState;
    },
  };
}

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

/** Grant every tier up to and including `top` so `requires` is always reachable. */
const grantUpTo = (top: CapTier): CapSet => {
  const ALL: readonly CapTier[] = ['static', 'styled', 'reactive', 'animated', 'gpu'];
  return Cap.from(ALL.filter((l) => Cap.ordinal(l) <= Cap.ordinal(top)));
};

/** A sealed PolicyNode keyed by its (requires, grants, sites, budgets) payload. */
function policy(opts: {
  requires: CapTier;
  grants: CapSet;
  sites: readonly RuntimeSite[];
  budgets?: PolicyNode['budgets'];
}): PolicyNode {
  return sealNode({
    _tag: 'DocGraphPolicyNode',
    _version: 1,
    family: 'policy',
    id: '',
    meta: META,
    appliesTo: [],
    requires: opts.requires,
    grants: opts.grants,
    sites: opts.sites,
    budgets: opts.budgets,
  } as unknown as PolicyNode);
}

describe('Compositor escalation gate (E)', () => {
  test('permissive policy (gpu, ample budget) admits all targets', () => {
    const p = policy({ requires: 'animated', grants: grantUpTo('animated'), sites: ['node'] });
    const { compositor } = Compositor.create({
      runtimeSite: 'node',
      getPolicy: () => p,
    });
    compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));
    const state = compositor.compute();

    // animated tier admits css/glsl/aria → every channel emits.
    expect(state.outputs.css['--liteship-layout']).toBe('mobile');
    expect(state.outputs.glsl['u_layout']).toBe(0);
    expect(state.outputs.aria['data-liteship-layout']).toBe('mobile');
  });

  test('tight p95 budget downgrades the tier and drops glsl, keeping css/aria', () => {
    // requires gpu/animated (glsl-admitting) but a 5ms p95 only affords the
    // reactive tier, whose admissible targets are css/aria (no glsl).
    const p = policy({
      requires: 'animated',
      grants: grantUpTo('animated'),
      sites: ['node'],
      budgets: { p95Ms: 5 },
    });
    const { compositor } = Compositor.create({
      runtimeSite: 'node',
      getPolicy: () => p,
    });
    compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));
    const state = compositor.compute();

    // css + aria survive; glsl is dropped by the downgraded tier.
    expect(state.outputs.css['--liteship-layout']).toBe('mobile');
    expect(state.outputs.aria['data-liteship-layout']).toBe('mobile');
    expect(state.outputs.glsl['u_layout']).toBeUndefined();
  });

  test('no matching policy is pass-through (all targets emit)', () => {
    const { compositor } = Compositor.create({
      runtimeSite: 'node',
      // getPolicy present but returns no policy for this projection.
      getPolicy: () => undefined,
    });
    compositor.add('layout', makeQuantizer(widthBoundary, 'tablet'));
    const state = compositor.compute();

    expect(state.outputs.css['--liteship-layout']).toBe('tablet');
    expect(state.outputs.glsl['u_layout']).toBe(1);
    expect(state.outputs.aria['data-liteship-layout']).toBe('tablet');
  });

  test('unsatisfiable policy ({error} branch: site not admitted) denies every target', () => {
    // Policy admits only 'browser'; the compositor evaluates against 'node' →
    // chooseTier returns { error } → deny-all for that projection.
    const p = policy({ requires: 'animated', grants: grantUpTo('animated'), sites: ['browser'] });
    const { compositor } = Compositor.create({
      runtimeSite: 'node',
      getPolicy: () => p,
    });
    compositor.add('layout', makeQuantizer(widthBoundary, 'desktop'));
    const state = compositor.compute();

    // Discrete bookkeeping still tracks the projection, but NO target emits.
    expect(state.discrete['layout']).toBe('desktop');
    expect(state.outputs.css['--liteship-layout']).toBeUndefined();
    expect(state.outputs.glsl['u_layout']).toBeUndefined();
    expect(state.outputs.aria['data-liteship-layout']).toBeUndefined();
  });

  test('per-projection gate: governed projection drops glsl, ungoverned one keeps it', () => {
    const constrained = policy({
      requires: 'animated',
      grants: grantUpTo('animated'),
      sites: ['node'],
      budgets: { p95Ms: 5 },
    });
    const { compositor } = Compositor.create({
      runtimeSite: 'node',
      getPolicy: (id: ContentAddress) => (id === ('gated' as ContentAddress) ? constrained : undefined),
    });
    compositor.add('gated', makeQuantizer(widthBoundary, 'mobile'));
    compositor.add('free', makeQuantizer(widthBoundary, 'tablet'));
    const state = compositor.compute();

    // Gated projection: glsl dropped, css/aria kept.
    expect(state.outputs.css['--liteship-gated']).toBe('mobile');
    expect(state.outputs.glsl['u_gated']).toBeUndefined();
    expect(state.outputs.aria['data-liteship-gated']).toBe('mobile');

    // Ungoverned projection: every target emits.
    expect(state.outputs.css['--liteship-free']).toBe('tablet');
    expect(state.outputs.glsl['u_free']).toBe(1);
    expect(state.outputs.aria['data-liteship-free']).toBe('tablet');
  });

  test('LESSON (getPolicy name-keyed): getPolicy receives the registry NAME passed to add(), not a content address', () => {
    // WHY: the compositor knows projections by their registry name (the string
    // handed to `add`), NOT by graph projection ids / content addresses. A host
    // that maps graph ids → names does so at the `getPolicy` boundary. If the gate
    // ever passed a content address instead, every name-keyed `getPolicy` lookup
    // would silently miss and fall through to pass-through — disabling escalation.
    const seen: string[] = [];
    const { compositor } = Compositor.create({
      runtimeSite: 'node',
      getPolicy: (name) => {
        seen.push(name);
        return undefined;
      },
    });
    compositor.add('hero-layout', makeQuantizer(widthBoundary, 'tablet'));

    // The argument is exactly the name passed to `add` — a plain registry string,
    // never a `fnv1a:...`/content-address shape.
    expect(seen).toContain('hero-layout');
    for (const arg of seen) {
      expect(arg).toBe('hero-layout');
      expect(arg).not.toMatch(/^[a-z0-9]+:[0-9a-f]+$/i);
    }
  });
});
