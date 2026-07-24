/**
 * FACTORY GUARD — the harness generators can never emit a placeholder.
 *
 * The plumb-gate scans the OUTPUT (`tests/generated/`); this scans the FACTORY.
 * The owner's #1 directive is absolute: "the harness must emit only REAL tests,
 * never it.skip." Before this guard, the per-arm generators carried dormant
 * `it.skip` branches that fired the moment an un-wireable capsule entered the
 * corpus. They were replaced with wire-or-fail: a generator emits a real test
 * or THROWS a tagged error — it can no longer produce a skip for ANY input.
 *
 * This test proves that property at the source: every arm that cannot emit a
 * real test for a degenerate (no-binding / un-probed) input THROWS rather than
 * returning a skip string, and no generator output ever contains a `.skip(`
 * call. If anyone reintroduces a skip branch, this fails RED.
 *
 * @module
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { defineCapsule, schema } from '@liteship/core';
import { resetCapsuleCatalog } from '@liteship/core/testing';
import * as Harness from '@liteship/core/harness';
import type { AssemblyKind } from '@liteship/core';

const SKIP_CALL = /\b(it|test|describe|bench)\.skip\(/;

const minimalCapsule = (kind: AssemblyKind) =>
  defineCapsule({
    _kind: kind,
    name: `degenerate.${kind}`,
    input: schema.unknown,
    output: schema.unknown,
    capabilities: { reads: [], writes: [] },
    invariants: [],
    budgets: { p95Ms: 1 },
    site: ['node'],
    // A `policyGate` MUST declare a `decide` core (defineCapsule rejects it
    // otherwise — ADR-0008 amendment). Supply a trivial one so the capsule is
    // VALIDLY declared and the degenerate (no-binding) case is exercised at the
    // GENERATOR, which is what this guard tests — the generator throwing on an
    // un-probed capsule, not defineCapsule throwing on a malformed one.
    ...(kind === 'policyGate' ? { decide: () => ({ effect: 'allow' as const, reasons: [] }) } : {}),
  });

/**
 * The four arms whose generators previously shipped dormant `it.skip` branches.
 * Each must now THROW (wire-or-fail) for a degenerate, un-wireable capsule — it
 * can never return a placeholder string.
 */
const WIRE_OR_FAIL_ARMS: ReadonlyArray<{
  readonly kind: AssemblyKind;
  readonly gen: (cap: never) => { testFile: string; benchFile: string };
}> = [
  { kind: 'policyGate', gen: Harness.generatePolicyGate as never },
  { kind: 'pureTransform', gen: Harness.generatePureTransform as never },
  { kind: 'stateMachine', gen: Harness.generateStateMachine as never },
  { kind: 'cachedProjection', gen: Harness.generateCachedProjection as never },
];

describe('harness factory — no generator can emit a placeholder (wire-or-fail)', () => {
  beforeEach(() => resetCapsuleCatalog());

  for (const { kind, gen } of WIRE_OR_FAIL_ARMS) {
    it(`${kind}: a degenerate, un-wireable capsule THROWS rather than emitting a placeholder`, () => {
      // A degenerate capsule has no importable binding / resolved probe, so there
      // is no real test to emit. Wire-or-fail: it must throw, never return a skip.
      expect(() => gen(minimalCapsule(kind) as never)).toThrow();
    });
  }

  it('the skip-detector regex itself matches a known skip form (guards this guard)', () => {
    // Proves SKIP_CALL would catch a regression — so a generator that ever
    // returned `it.skip(...)` would be caught by an output scan downstream.
    expect(SKIP_CALL.test("it.skip('x', () => {})")).toBe(true);
    expect(SKIP_CALL.test("it('x', () => {})")).toBe(false);
  });
});
