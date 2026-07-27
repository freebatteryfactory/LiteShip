/**
 * The host transition-facts builder + the END-TO-END loop (Wave 5.5, the transition
 * cage — builder → the lean gate). Proves the host bridge folds pre-run oracle outcomes
 * into flat {@link TransitionFacts} the {@link transitionConformanceGate} then reports
 * over, with NO real primitive capture (tiny in-memory op histories + normalized
 * observation values standing in for the Foundation harness output). The builder OWNS the
 * bisimulation comparison — it decides `equivalent` on the EXACT canonical bytes (never a
 * hash equality) and mints SHA-256 addresses for the compact facts.
 *
 * @module
 */
// PROVES: INV-TRANSITION-FACTS-DETERMINISTIC
import { describe, it, expect } from 'vitest';
import { buildTransitionFacts, type TransitionRun, type OracleOutcome } from '@liteship/audit';
import { transitionConformanceGate, memoryContext, type GateContext } from '@liteship/gauntlet';

/** An observed oracle outcome carrying a normalized observation (the builder addresses it, SHA-256). */
const observed = (observation: unknown): OracleOutcome => ({ kind: 'observed', observation });
/** An unevidenced oracle outcome (a side that produced no trace). */
const unevidenced = (reason: string): OracleOutcome => ({ kind: 'unevidenced', reason });

/** A tiny CBOR-encodable op history — the builder content-addresses it, never parses it. */
function history(...tags: readonly string[]): readonly { readonly _tag: string }[] {
  return tags.map((_tag) => ({ _tag }));
}

/** A run whose two sides AGREE (byte-identical observations → equivalent) over a subscribe/set history. */
function equivalentRun(seed: string): TransitionRun {
  return {
    seed,
    history: history('subscribe', 'set', 'read', 'dispose'),
    operations: ['subscribe', 'set', 'read', 'dispose'],
    model: observed({ delivered: [1, 2], final: 2 }),
    implementation: observed({ delivered: [1, 2], final: 2 }),
  };
}

/** A run whose two sides DIFFER (divergent observations). */
function divergentRun(seed: string): TransitionRun {
  return {
    seed,
    history: history('subscribe', 'set', 'set', 'dispose'),
    operations: ['subscribe', 'set', 'set', 'dispose'],
    model: observed({ delivered: [1, 2], final: 2 }),
    implementation: observed({ delivered: [1, 3], final: 3 }),
  };
}

const OPTIONS = {
  family: 'cell',
  modelDigest: 'sha256:100d0000',
  implementationDigest: 'sha256:1e100000',
} as const;

const SHA256 = /^sha256:[0-9a-f]{64}$/;

function irlessCtx(facts: GateContext['transition']): GateContext {
  return { ...memoryContext({}), transition: facts };
}

describe('buildTransitionFacts — host bridge folds oracle outcomes into facts', () => {
  it('decides equivalent (digests agree) / divergent (digests differ) / unevidenced (a side missing)', () => {
    const facts = buildTransitionFacts(
      [
        equivalentRun('0xeq'),
        divergentRun('0xdv'),
        {
          seed: '0xun',
          history: history('subscribe', 'set'),
          operations: ['subscribe', 'set'],
          model: observed({ delivered: [1], final: 1 }),
          implementation: unevidenced('construction threw'),
        },
      ],
      OPTIONS,
    );
    const bySeed = new Map(facts.cases.map((c) => [c.seed, c]));
    expect(bySeed.get('0xeq')!.status).toBe('equivalent');
    expect(bySeed.get('0xdv')!.status).toBe('divergent');
    expect(bySeed.get('0xun')!.status).toBe('unevidenced');
    // The divergent case records BOTH observation digests as SHA-256 addresses, and they
    // DIFFER (so the gate reports the replay); the equivalent case's two digests AGREE.
    expect(bySeed.get('0xdv')!.modelObservationDigest).toMatch(SHA256);
    expect(bySeed.get('0xdv')!.implementationObservationDigest).toMatch(SHA256);
    expect(bySeed.get('0xdv')!.modelObservationDigest).not.toBe(bySeed.get('0xdv')!.implementationObservationDigest);
    expect(bySeed.get('0xeq')!.modelObservationDigest).toBe(bySeed.get('0xeq')!.implementationObservationDigest);
    // The traceDigest is a canonical SHA-256 content address of the op history.
    expect(bySeed.get('0xeq')!.traceDigest).toMatch(SHA256);
    // The present side of an unevidenced case still records its SHA-256 address; the absent side empty.
    expect(bySeed.get('0xun')!.modelObservationDigest).toMatch(SHA256);
    expect(bySeed.get('0xun')!.implementationObservationDigest).toBe('');
    // operationCount reflects the history depth.
    expect(bySeed.get('0xeq')!.operationCount).toBe(4);
  });

  it('folds the operation coverage across the corpus (op tag → count)', () => {
    const facts = buildTransitionFacts([equivalentRun('0xa'), divergentRun('0xb')], OPTIONS);
    // subscribe: 2 (both), set: 3 (1 + 2), read: 1, dispose: 2.
    expect(facts.operationCoverage.subscribe).toBe(2);
    expect(facts.operationCoverage.set).toBe(3);
    expect(facts.operationCoverage.read).toBe(1);
    expect(facts.operationCoverage.dispose).toBe(2);
  });

  it('carries the family + transport fingerprints + the optional unevidenced baseline', () => {
    const facts = buildTransitionFacts([equivalentRun('0xa')], { ...OPTIONS, unevidencedBaseline: 3 });
    expect(facts.family).toBe('cell');
    expect(facts.modelDigest).toBe('sha256:100d0000');
    expect(facts.implementationDigest).toBe('sha256:1e100000');
    expect(facts.unevidencedBaseline).toBe(3);
  });

  it('is deterministic — same inputs → byte-identical facts (order-independent)', () => {
    const runs = [divergentRun('0xz'), equivalentRun('0xa'), divergentRun('0xm')];
    const a = buildTransitionFacts(runs, OPTIONS);
    const b = buildTransitionFacts([...runs].reverse(), OPTIONS);
    // Cases are sorted by (seed, traceDigest), so reversed input yields identical facts.
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.cases.map((c) => c.seed)).toEqual(['0xa', '0xm', '0xz']);
  });

  it('END-TO-END: the lean gate reports the divergent case the host built as a blocking L4 finding', () => {
    const facts = buildTransitionFacts([equivalentRun('0xok'), divergentRun('0xbad')], OPTIONS);
    const badCase = facts.cases.find((c) => c.seed === '0xbad')!;
    const findings = transitionConformanceGate.run(irlessCtx(facts));
    // The equivalent case is silent; the divergent case is a blocking L4 finding.
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.level).toBe('L4');
    expect(findings[0]!.detail).toContain('0xbad');
    // The finding replays the exact SHA-256 observation addresses the builder minted.
    expect(badCase.modelObservationDigest).toMatch(SHA256);
    expect(findings[0]!.detail).toContain(badCase.modelObservationDigest);
    expect(findings[0]!.detail).toContain(badCase.implementationObservationDigest);
  });
});
