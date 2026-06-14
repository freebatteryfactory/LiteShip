/**
 * Compositor escalation gate (E) -- chooseRung wired into the emit phase.
 *
 * Proves that a budget-constrained `PolicyNode` resolved via `getPolicy`
 * downgrades the rung and drops the targets that rung no longer admits (e.g. a
 * tight `budgets.p95Ms` strips `glsl`, leaving `css`/`aria`), that a permissive
 * policy admits all targets, that an absent policy is pass-through, and that the
 * `{ error }` branch (site not admitted) denies every target for that projection.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { Boundary, Compositor, Cap, sealNode } from '@czap/core';
import type { PolicyNode, RuntimeSite, CapLevel, CapSet, CellMeta, ContentAddress } from '@czap/core';
import { Effect } from 'effect';
import { runScopedAsync as runScoped } from '../../helpers/effect-test.js';

const widthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

function makeQuantizer(boundary: Boundary.Shape, initialState?: string) {
  let currentState = initialState ?? (boundary.states[0] as string);
  return {
    boundary,
    state: Effect.succeed(currentState),
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

/** Grant every rung up to and including `top` so `requires` is always reachable. */
const grantUpTo = (top: CapLevel): CapSet => {
  const ALL: readonly CapLevel[] = ['static', 'styled', 'reactive', 'animated', 'gpu'];
  return Cap.from(ALL.filter((l) => Cap.ordinal(l) <= Cap.ordinal(top)));
};

/** A sealed PolicyNode keyed by its (requires, grants, sites, budgets) payload. */
function policy(opts: {
  requires: CapLevel;
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
  test('permissive policy (gpu, ample budget) admits all targets', async () => {
    const p = policy({ requires: 'animated', grants: grantUpTo('animated'), sites: ['node'] });
    const compositor = await runScoped(
      Compositor.create({
        runtimeSite: 'node',
        getPolicy: () => p,
      }),
    );
    await Effect.runPromise(compositor.add('layout', makeQuantizer(widthBoundary, 'mobile')));
    const state = await Effect.runPromise(compositor.compute());

    // animated rung admits css/glsl/aria → every channel emits.
    expect(state.outputs.css['--czap-layout']).toBe('mobile');
    expect(state.outputs.glsl['u_layout']).toBe(0);
    expect(state.outputs.aria['data-czap-layout']).toBe('mobile');
  });

  test('tight p95 budget downgrades the rung and drops glsl, keeping css/aria', async () => {
    // requires gpu/animated (glsl-admitting) but a 5ms p95 only affords the
    // reactive rung, whose admissible targets are css/aria (no glsl).
    const p = policy({
      requires: 'animated',
      grants: grantUpTo('animated'),
      sites: ['node'],
      budgets: { p95Ms: 5 },
    });
    const compositor = await runScoped(
      Compositor.create({
        runtimeSite: 'node',
        getPolicy: () => p,
      }),
    );
    await Effect.runPromise(compositor.add('layout', makeQuantizer(widthBoundary, 'mobile')));
    const state = await Effect.runPromise(compositor.compute());

    // css + aria survive; glsl is dropped by the downgraded rung.
    expect(state.outputs.css['--czap-layout']).toBe('mobile');
    expect(state.outputs.aria['data-czap-layout']).toBe('mobile');
    expect(state.outputs.glsl['u_layout']).toBeUndefined();
  });

  test('no matching policy is pass-through (all targets emit)', async () => {
    const compositor = await runScoped(
      Compositor.create({
        runtimeSite: 'node',
        // getPolicy present but returns no policy for this projection.
        getPolicy: () => undefined,
      }),
    );
    await Effect.runPromise(compositor.add('layout', makeQuantizer(widthBoundary, 'tablet')));
    const state = await Effect.runPromise(compositor.compute());

    expect(state.outputs.css['--czap-layout']).toBe('tablet');
    expect(state.outputs.glsl['u_layout']).toBe(1);
    expect(state.outputs.aria['data-czap-layout']).toBe('tablet');
  });

  test('unsatisfiable policy ({error} branch: site not admitted) denies every target', async () => {
    // Policy admits only 'browser'; the compositor evaluates against 'node' →
    // chooseRung returns { error } → deny-all for that projection.
    const p = policy({ requires: 'animated', grants: grantUpTo('animated'), sites: ['browser'] });
    const compositor = await runScoped(
      Compositor.create({
        runtimeSite: 'node',
        getPolicy: () => p,
      }),
    );
    await Effect.runPromise(compositor.add('layout', makeQuantizer(widthBoundary, 'desktop')));
    const state = await Effect.runPromise(compositor.compute());

    // Discrete bookkeeping still tracks the projection, but NO target emits.
    expect(state.discrete['layout']).toBe('desktop');
    expect(state.outputs.css['--czap-layout']).toBeUndefined();
    expect(state.outputs.glsl['u_layout']).toBeUndefined();
    expect(state.outputs.aria['data-czap-layout']).toBeUndefined();
  });

  test('per-projection gate: governed projection drops glsl, ungoverned one keeps it', async () => {
    const constrained = policy({
      requires: 'animated',
      grants: grantUpTo('animated'),
      sites: ['node'],
      budgets: { p95Ms: 5 },
    });
    const compositor = await runScoped(
      Compositor.create({
        runtimeSite: 'node',
        getPolicy: (id: ContentAddress) => (id === ('gated' as ContentAddress) ? constrained : undefined),
      }),
    );
    await Effect.runPromise(compositor.add('gated', makeQuantizer(widthBoundary, 'mobile')));
    await Effect.runPromise(compositor.add('free', makeQuantizer(widthBoundary, 'tablet')));
    const state = await Effect.runPromise(compositor.compute());

    // Gated projection: glsl dropped, css/aria kept.
    expect(state.outputs.css['--czap-gated']).toBe('mobile');
    expect(state.outputs.glsl['u_gated']).toBeUndefined();
    expect(state.outputs.aria['data-czap-gated']).toBe('mobile');

    // Ungoverned projection: every target emits.
    expect(state.outputs.css['--czap-free']).toBe('tablet');
    expect(state.outputs.glsl['u_free']).toBe(1);
    expect(state.outputs.aria['data-czap-free']).toBe('tablet');
  });

  test('LESSON (getPolicy name-keyed): getPolicy receives the registry NAME passed to add(), not a content address', async () => {
    // WHY: the compositor knows projections by their registry name (the string
    // handed to `add`), NOT by graph projection ids / content addresses. A host
    // that maps graph ids → names does so at the `getPolicy` boundary. If the gate
    // ever passed a content address instead, every name-keyed `getPolicy` lookup
    // would silently miss and fall through to pass-through — disabling escalation.
    const seen: string[] = [];
    const compositor = await runScoped(
      Compositor.create({
        runtimeSite: 'node',
        getPolicy: (name) => {
          seen.push(name);
          return undefined;
        },
      }),
    );
    await Effect.runPromise(compositor.add('hero-layout', makeQuantizer(widthBoundary, 'tablet')));

    // The argument is exactly the name passed to `add` — a plain registry string,
    // never a `fnv1a:...`/content-address shape.
    expect(seen).toContain('hero-layout');
    for (const arg of seen) {
      expect(arg).toBe('hero-layout');
      expect(arg).not.toMatch(/^[a-z0-9]+:[0-9a-f]+$/i);
    }
  });
});
