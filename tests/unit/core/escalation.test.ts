/**
 * Escalation chooser (P5c) — the READER of PolicyNode.
 *
 * Confirms `chooseRung` picks the MINIMAL CapLevel rung a policy admits on a
 * runtime site: site-gated, budget-downgraded, grants-bounded, and stable under
 * memoization.
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { chooseRung, sealNode, Cap } from '@czap/core';
import type { PolicyNode, RuntimeSite, CapLevel, CapSet, CellMeta } from '@czap/core';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
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

/** Grant every rung up to and including `top` (so `requires` is always reachable). */
const grantUpTo = (top: CapLevel): CapSet => {
  const ALL: readonly CapLevel[] = ['static', 'styled', 'reactive', 'animated', 'gpu'];
  return Cap.from(ALL.filter((l) => Cap.ordinal(l) <= Cap.ordinal(top)));
};

const isChoice = (r: ReturnType<typeof chooseRung>): r is { rung: CapLevel; admittedTargets: ReadonlySet<string> } =>
  'rung' in r;

describe('chooseRung — escalation chooser (P5c)', () => {
  test('requires animated on an admitted site, ample budget → animated', () => {
    const r = chooseRung(
      policy({ requires: 'animated', grants: grantUpTo('animated'), sites: ['browser'] }),
      'browser',
    );
    expect(isChoice(r) && r.rung).toBe('animated');
    // The animated rung admits css/glsl/aria per the local admissibility table.
    expect(isChoice(r) && [...r.admittedTargets].sort()).toEqual(['aria', 'css', 'glsl']);
  });

  test('a runtime site not in policy.sites is unsatisfiable (error)', () => {
    const r = chooseRung(
      policy({ requires: 'animated', grants: grantUpTo('animated'), sites: ['browser'] }),
      'edge',
    );
    expect(isChoice(r)).toBe(false);
    expect(!isChoice(r) && r.error).toMatch(/does not admit runtime site 'edge'/);
  });

  test('a tight p95 budget downgrades the rung below requires', () => {
    // requires 'gpu' (p95 floor 16ms) but budget only affords ~5ms → downgrade.
    const r = chooseRung(
      policy({
        requires: 'gpu',
        grants: grantUpTo('gpu'),
        sites: ['worker'],
        budgets: { p95Ms: 5 },
      }),
      'worker',
    );
    // 5ms clears reactive(4) but not animated(8)/gpu(16); walking DOWN from the
    // required gpu rung, the first affordable rung is reactive — the LEAST
    // downgrade the budget forces.
    expect(isChoice(r) && r.rung).toBe('reactive');
  });

  test("allocClass 'zero' forbids the gpu rung (downgrade)", () => {
    const r = chooseRung(
      policy({
        requires: 'gpu',
        grants: grantUpTo('gpu'),
        sites: ['node'],
        budgets: { allocClass: 'zero' },
      }),
      'node',
    );
    expect(isChoice(r)).toBe(true);
    expect(isChoice(r) && r.rung).not.toBe('gpu');
  });

  test('minimal-rung: unconstrained, the rung is exactly requires (no escalation)', () => {
    // requires 'gpu' with full grants and no budget → the chooser never escalates
    // above requires and has no reason to downgrade, so it returns 'gpu'.
    const r = chooseRung(
      policy({ requires: 'gpu', grants: grantUpTo('gpu'), sites: ['browser'] }),
      'browser',
    );
    expect(isChoice(r) && r.rung).toBe('gpu');
  });

  test('a missing intermediate grant forces a further downgrade', () => {
    // requires 'gpu', but 'gpu' and 'animated' are NOT granted; budget forbids
    // gpu via allocClass anyway. Walking down, the first granted+affordable rung
    // is reactive.
    const r = chooseRung(
      policy({
        requires: 'gpu',
        grants: Cap.from(['static', 'styled', 'reactive']),
        sites: ['worker'],
      }),
      'worker',
    );
    expect(isChoice(r) && r.rung).toBe('reactive');
  });

  test('no granted rung at or below requires → unsatisfiable', () => {
    const r = chooseRung(
      policy({ requires: 'styled', grants: Cap.from(['gpu']), sites: ['node'] }),
      'node',
    );
    expect(isChoice(r)).toBe(false);
    expect(!isChoice(r) && r.error).toMatch(/admits no rung/);
  });

  test('memoization is deterministic but returns ISOLATED results (the memo cannot be polluted)', () => {
    const p = policy({ requires: 'reactive', grants: grantUpTo('reactive'), sites: ['browser', 'worker'] });
    const a = chooseRung(p, 'browser');
    const b = chooseRung(p, 'browser');
    // Same key → value-equal verdict (memoized compute), but NOT a shared reference:
    // chooseRung returns a fresh admittedTargets copy so a caller mutating the result
    // can never pollute the process-global memo.
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    // A re-sealed structurally-equal policy shares the same content-addressed id,
    // so it hits the same memo entry (value-equal verdict). Checked BEFORE the
    // mutation below so `a` is still pristine.
    const p2 = policy({ requires: 'reactive', grants: grantUpTo('reactive'), sites: ['browser', 'worker'] });
    expect(chooseRung(p2, 'browser')).toEqual(a);
    // Isolation LAW (done LAST — it mutates `a`): polluting a returned set must not
    // leak into a later memo-hit.
    if ('error' in a) throw new Error('expected a rung');
    (a.admittedTargets as Set<string>).add('__probe__');
    const c = chooseRung(p, 'browser');
    if ('error' in c) throw new Error('expected a rung');
    expect((c.admittedTargets as ReadonlySet<string>).has('__probe__')).toBe(false);
  });
});
