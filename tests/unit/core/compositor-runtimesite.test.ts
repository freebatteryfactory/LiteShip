/**
 * @vitest-environment node
 *
 * Compositor default runtimeSite realm detection — worker / edge / node.
 *
 * When no explicit `runtimeSite` is configured, the compositor's escalation gate
 * must detect the REALM before defaulting to `node`, so worker and edge runtimes
 * (which the gate explicitly targets) don't collapse to `node` and consult the
 * wrong admission table. The detection ladder (`defaultRuntimeSite`) is:
 *   - real DOM (`window` + `document`)              ⇒ 'browser'
 *   - worker global (`WorkerGlobalScope` | `importScripts`) ⇒ 'worker'
 *   - edge global (`EdgeRuntime`)                    ⇒ 'edge'
 *   - none of the above                              ⇒ 'node'
 *
 * We can't read `defaultRuntimeSite` directly (module-internal), so we OBSERVE
 * the detected site through the gate: a policy whose `sites` admits ONLY the
 * detected realm emits its targets; against any other realm the gate's `{ error }`
 * branch denies everything. Stubbing the realm globals and asserting which way the
 * gate falls is a behavioral proof of the detected site.
 *
 * @module
 */

import { afterEach, describe, test, expect } from 'vitest';
import { Boundary, Compositor, Cap, sealNode } from '@liteship/core';
import type { PolicyNode, RuntimeSite, CapTier, CapSet, CellMeta } from '@liteship/core';

const widthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
  ] as const,
});

function makeQuantizer(boundary: Boundary.Shape, initialState: string) {
  let current = initialState;
  return {
    _tag: 'Quantizer' as const,
    boundary,
    stateSync: () => current,
    changes: null as never,
    evaluate(v: number) {
      current = Boundary.evaluate(boundary, v) as string;
      return current;
    },
  };
}

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

const grantUpTo = (top: CapTier): CapSet => {
  const ALL: readonly CapTier[] = ['static', 'styled', 'reactive', 'animated', 'gpu'];
  return Cap.from(ALL.filter((l) => Cap.ordinal(l) <= Cap.ordinal(top)));
};

/** A policy that admits exactly `sites` — used to probe the gate's detected realm. */
function siteOnlyPolicy(sites: readonly RuntimeSite[]): PolicyNode {
  return sealNode({
    _tag: 'DocGraphPolicyNode',
    _version: 1,
    family: 'policy',
    id: '',
    meta: META,
    appliesTo: [],
    requires: 'animated',
    grants: grantUpTo('animated'),
    sites,
    budgets: undefined,
  } as unknown as PolicyNode);
}

/**
 * Build a compositor with NO explicit runtimeSite (so the default detector runs),
 * gate a projection on a policy admitting only `admitSite`, and report whether
 * that projection's css survived — i.e. whether the detected realm === admitSite.
 */
function detectedSiteAdmits(admitSite: RuntimeSite): boolean {
  const { compositor } = Compositor.create({
    // runtimeSite intentionally omitted → defaultRuntimeSite() runs.
    getPolicy: () => siteOnlyPolicy([admitSite]),
  });
  compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));
  const state = compositor.compute();
  // Pass-through is ruled out (a policy is always returned); the projection emits
  // css iff the chosen rung admitted it, which happens iff the detected site is in
  // the policy's `sites`. Otherwise chooseRung → { error } → deny-all.
  return state.outputs.css['--liteship-layout'] !== undefined;
}

const g = globalThis as Record<string, unknown>;

afterEach(() => {
  delete g['WorkerGlobalScope'];
  delete g['importScripts'];
  delete g['EdgeRuntime'];
});

describe('Compositor default runtimeSite realm detection', () => {
  test("LESSON (runtimeSite@worker): a worker global makes the default site resolve to 'worker'", async () => {
    // WHY: a worker host that forgets to pass runtimeSite must still be gated as a
    // worker, not silently as node, or it consults the wrong admission table.
    g['WorkerGlobalScope'] = function WorkerGlobalScope() {};
    g['importScripts'] = () => {};

    expect(await detectedSiteAdmits('worker')).toBe(true);
    expect(await detectedSiteAdmits('node')).toBe(false);
    expect(await detectedSiteAdmits('edge')).toBe(false);
  });

  test("LESSON (runtimeSite@edge): an EdgeRuntime global makes the default site resolve to 'edge'", async () => {
    // WHY: edge runtimes are an explicit gate target; collapsing to node here would
    // mis-admit targets the edge tier should never run.
    g['EdgeRuntime'] = 'fastly-or-vercel-edge';

    expect(await detectedSiteAdmits('edge')).toBe(true);
    expect(await detectedSiteAdmits('node')).toBe(false);
    expect(await detectedSiteAdmits('worker')).toBe(false);
  });

  test("LESSON (runtimeSite@node): with no realm globals the default site resolves to 'node'", async () => {
    // WHY: the fallback rung. No worker/edge/browser markers ⇒ plain node.
    // (jsdom-canvas setup does not install WorkerGlobalScope/EdgeRuntime.)
    expect(await detectedSiteAdmits('node')).toBe(true);
    expect(await detectedSiteAdmits('worker')).toBe(false);
    expect(await detectedSiteAdmits('edge')).toBe(false);
  });
});
