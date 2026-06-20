/**
 * escalation-choose-rung capsule — direct unit assertions over the FIRST
 * `policyGate` instance (ADR-0008's closure rule). The generated traversal
 * (`tests/generated/core-escalation-choose-rung.test.ts`) drives the allow/deny
 * + reason-chain + determinism laws under random subjects; this file pins the
 * declaration shape and that the `decide` core's verdict is the REAL `chooseRung`
 * result mapped to a {@link Decision} — never a weakened stand-in.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { escalationChooseRungCapsule, chooseRung, sealNode, Cap } from '@czap/core';
import type { Decision, PolicyNode, RuntimeSite, CellMeta } from '@czap/core';
import { _escalationChooseRungInternals } from '../../../../packages/core/src/capsules/escalation-choose-rung.js';

const { buildPolicy, decideEscalation, denyCode, isChoice } = _escalationChooseRungInternals;

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

describe('escalationChooseRungCapsule (declaration)', () => {
  it('declares a policyGate capsule with a content-addressed id — the first policyGate instance', () => {
    expect(escalationChooseRungCapsule._kind).toBe('policyGate');
    expect(escalationChooseRungCapsule.name).toBe('core.escalation.choose-rung');
    expect(escalationChooseRungCapsule.id).toMatch(/^fnv1a:/);
  });

  it('exposes a pure `decide` verdict core (the policyGate channel)', () => {
    expect(typeof escalationChooseRungCapsule.decide).toBe('function');
  });

  it('declares its four policyGate invariants, each with a name + message + check', () => {
    const names = escalationChooseRungCapsule.invariants.map((i) => i.name);
    expect(names).toEqual([
      'deny-iff-nonempty-reasons',
      'site-gate-forces-deny',
      'allow-rung-never-escalates-above-requires',
      'allow-targets-subset-of-rung-targets',
    ]);
    for (const inv of escalationChooseRungCapsule.invariants) {
      expect(inv.name).toBeTruthy();
      expect(inv.message).toBeTruthy();
      expect(typeof inv.check).toBe('function');
    }
  });
});

describe('decideEscalation — the verdict core is the REAL chooser, mapped to a Decision', () => {
  it('admits a granted, in-budget rung on an admitted site: allow with an EMPTY reason chain', () => {
    const verdict: Decision = decideEscalation({
      requires: 'gpu',
      grants: ['static', 'styled', 'reactive', 'animated', 'gpu'],
      sites: ['browser'],
      site: 'browser',
    });
    // An allow is a bare admission — the reason chain justifies rejections only.
    expect(verdict.effect).toBe('allow');
    expect(verdict.reasons).toHaveLength(0);
    // The admitted rung is the chooser's OUTPUT, read off chooseRung directly.
    const result = chooseRung(
      buildPolicy({ requires: 'gpu', grants: ['static', 'styled', 'reactive', 'animated', 'gpu'], sites: ['browser'], site: 'browser' }),
      'browser',
    );
    expect(isChoice(result) && result.rung).toBe('gpu');
  });

  it('a site the policy does not admit is a deny with the REAL chooser error string', () => {
    const subject = {
      requires: 'reactive' as const,
      grants: ['static', 'styled', 'reactive'] as const,
      sites: ['browser'] as const,
      site: 'edge' as const,
    };
    const verdict = decideEscalation(subject);
    expect(verdict.effect).toBe('deny');
    expect(verdict.reasons).toHaveLength(1);
    expect(verdict.reasons[0]?.code).toBe('site-not-admitted');
    // The message is the chooser's OWN error string verbatim — not fabricated.
    const policy = buildPolicy(subject);
    const result = chooseRung(policy, subject.site);
    expect(isChoice(result)).toBe(false);
    expect(verdict.reasons[0]?.message).toBe((result as { error: string }).error);
  });

  it('a policy that grants no rung at/below requires is a deny coded no-rung-admits', () => {
    // requires=static → the only candidate rung is `static`; it is NOT granted
    // (only styled, which is ABOVE static and never a candidate) → no admissible rung.
    const verdict = decideEscalation({
      requires: 'static',
      grants: ['styled'],
      sites: ['node'],
      site: 'node',
    });
    expect(verdict.effect).toBe('deny');
    expect(verdict.reasons[0]?.code).toBe('no-rung-admits');
  });

  it('the allow rung never escalates above requires (the chooser only downgrades)', () => {
    // requires reactive, but only styled granted → downgrades to styled (≤ reactive).
    const subject = {
      requires: 'reactive' as const,
      grants: ['static', 'styled'] as const,
      sites: ['browser'] as const,
      site: 'browser' as const,
    };
    const verdict = decideEscalation(subject);
    expect(verdict.effect).toBe('allow');
    expect(verdict.reasons).toHaveLength(0);
    // The chooser downgraded to styled (the highest granted rung ≤ reactive).
    const result = chooseRung(buildPolicy(subject), subject.site);
    expect(isChoice(result) && result.rung).toBe('styled');
  });

  it('determinism: the same subject yields a deep-equal verdict twice', () => {
    const subject = {
      requires: 'animated' as const,
      grants: ['static', 'styled', 'reactive', 'animated'] as const,
      sites: ['worker'] as const,
      site: 'worker' as const,
    };
    expect(decideEscalation(subject)).toEqual(decideEscalation(subject));
  });
});

describe('denyCode — stable classification of the chooser error', () => {
  it('codes the site-gate error as site-not-admitted, everything else as no-rung-admits', () => {
    expect(denyCode("policy fnv1a:x does not admit runtime site 'edge' (admits: browser)")).toBe('site-not-admitted');
    expect(denyCode("policy fnv1a:x admits no rung at or below 'gpu' on 'node' under its grants/budgets")).toBe(
      'no-rung-admits',
    );
  });
});

describe('buildPolicy — seals a real, content-addressed PolicyNode from the subject', () => {
  it('mints an fnv1a id and carries the subject capability fields faithfully', () => {
    const policy: PolicyNode = buildPolicy({
      requires: 'animated',
      grants: ['static', 'animated'],
      sites: ['node', 'browser'],
      site: 'node' as RuntimeSite,
      p95Ms: 12,
    });
    expect(policy.id).toMatch(/^fnv1a:/);
    expect(policy.requires).toBe('animated');
    expect(Cap.has(policy.grants, 'animated')).toBe(true);
    expect(policy.sites).toEqual(['node', 'browser']);
    expect(policy.budgets?.p95Ms).toBe(12);
    // meta is excluded from the address, so a constant META is faithful.
    void META;
  });
});
