/**
 * Traceability-bridge gate (the avionics-tier requirements-traceability ledger) —
 * the self-proving fold over the host-supplied {@link TraceabilityFacts}.
 *
 * Pins:
 *  - the authority ratchet: red caught, green clean, mutation killed → blocking.
 *  - an UNTRACED L3/L4 invariant reds (error); below L3 it is a warning (the
 *    level-keyed severity matrix).
 *  - an EXPIRED waiver reds; a WAIVED (live) invariant is clean.
 *  - a ledger⇔header DIVERGENCE reds at L4 (the bidirectional-trace check).
 *  - the gate is LEAN: it folds facts, parses no YAML, reads no clock (a pure
 *    function of `context.traceability`).
 */

import { describe, it, expect } from 'vitest';
import {
  traceabilityBridgeGate,
  verifyGate,
  earnedAuthority,
  memoryContext,
  type GateContext,
  type TraceabilityFacts,
  type ResolvedInvariant,
} from '@czap/gauntlet';

/** A GateContext carrying a literal TraceabilityFacts record. */
function ctx(facts: TraceabilityFacts): GateContext {
  return { ...memoryContext({}), traceability: facts };
}

/** A facts record from a list of resolved invariants + divergences. */
function facts(
  invariants: readonly ResolvedInvariant[],
  divergences: TraceabilityFacts['divergences'] = [],
): TraceabilityFacts {
  return { invariants, divergences, ledgerAddress: 'fnv1a:test' };
}

describe('traceability-bridge gate — the authority ratchet', () => {
  it('self-proves and earns blocking authority', () => {
    const proof = verifyGate(traceabilityBridgeGate);
    expect(proof.selfProven).toBe(true);
    expect(earnedAuthority(proof)).toBe('blocking');
  });

  it('is L4 (avionics tier)', () => {
    expect(traceabilityBridgeGate.level).toBe('L4');
  });
});

describe('traceability-bridge gate — the lifecycle fold', () => {
  it('a PROVEN invariant emits ZERO findings (the happy path)', () => {
    const findings = traceabilityBridgeGate.run(
      ctx(
        facts([
          {
            id: 'INV-X',
            law: 'x',
            level: 'L4',
            category: 'crdt',
            state: { _tag: 'proven', provingTests: ['t.test.ts::proves'] },
          },
        ]),
      ),
    );
    expect(findings).toHaveLength(0);
  });

  it('a WAIVED (live) invariant emits ZERO findings (a sanctioned deferral)', () => {
    const findings = traceabilityBridgeGate.run(
      ctx(
        facts([
          {
            id: 'INV-X',
            law: 'x',
            level: 'L4',
            category: 'crdt',
            state: { _tag: 'waived', owner: 'o', justification: 'j', expiry: '2999-01-01' },
          },
        ]),
      ),
    );
    expect(findings).toHaveLength(0);
  });

  it('an UNTRACED L4 invariant reds as an ERROR', () => {
    const findings = traceabilityBridgeGate.run(
      ctx(
        facts([
          {
            id: 'INV-X',
            law: 'x',
            level: 'L4',
            category: 'crdt',
            state: { _tag: 'untraced', reason: 'no proof.' },
          },
        ]),
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.ruleId).toBe('gauntlet/traceability/untraced');
    expect(findings[0]!.level).toBe('L4');
  });

  it('an UNTRACED L1 invariant is a WARNING (the level-keyed severity matrix), not an error', () => {
    const findings = traceabilityBridgeGate.run(
      ctx(
        facts([
          {
            id: 'INV-X',
            law: 'x',
            level: 'L1',
            category: 'meta',
            state: { _tag: 'untraced', reason: 'no proof.' },
          },
        ]),
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('warning');
  });

  it('an EXPIRED waiver reds as an ERROR (the debt came due)', () => {
    const findings = traceabilityBridgeGate.run(
      ctx(
        facts([
          {
            id: 'INV-X',
            law: 'x',
            level: 'L4',
            category: 'crdt',
            state: { _tag: 'expired', owner: 'o', justification: 'j', expiry: '2000-01-01' },
          },
        ]),
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.ruleId).toBe('gauntlet/traceability/waiver-expired');
  });

  it('a ledger⇔header DIVERGENCE reds at L4 (the bidirectional-trace check)', () => {
    const findings = traceabilityBridgeGate.run(
      ctx(
        facts(
          [],
          [
            {
              kind: 'undeclared-proof',
              invariantId: 'INV-GHOST',
              detail: 'a test PROVES INV-GHOST, undeclared.',
              subject: 't.test.ts',
            },
          ],
        ),
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.level).toBe('L4');
    expect(findings[0]!.ruleId).toBe('gauntlet/traceability/divergence/undeclared-proof');
  });

  it('ABSENT facts ⇒ the gate folds nothing (the honest no-op, never a silent green over an unparsed ledger)', () => {
    // No `traceability` on the context — the host did not run the state machine.
    const findings = traceabilityBridgeGate.run(memoryContext({}));
    expect(findings).toHaveLength(0);
  });
});
