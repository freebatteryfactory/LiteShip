/**
 * The host transition-facts builder + the END-TO-END loop (Wave 5.5, the transition
 * cage — builder → the lean gate). Proves the host bridge folds pre-run oracle outcomes
 * into flat {@link TransitionFacts} the {@link transitionConformanceGate} then reports
 * over, with NO real primitive capture (tiny in-memory op histories + stub observation
 * digests standing in for the Foundation harness output).
 *
 * @module
 */
// PROVES: INV-TRANSITION-FACTS-DETERMINISTIC
import { describe, it, expect } from 'vitest';
import { buildTransitionFacts, type TransitionRun, type OracleOutcome } from '@czap/audit';
import { transitionConformanceGate, memoryContext, type GateContext } from '@czap/gauntlet';

/** An observed oracle outcome carrying a digest. */
const observed = (digest: string): OracleOutcome => ({ kind: 'observed', observationDigest: digest });
/** An unevidenced oracle outcome (a side that produced no trace). */
const unevidenced = (reason: string): OracleOutcome => ({ kind: 'unevidenced', reason });

/** A tiny CBOR-encodable op history — the builder content-addresses it, never parses it. */
function history(...tags: readonly string[]): readonly { readonly _tag: string }[] {
  return tags.map((_tag) => ({ _tag }));
}

/** A run whose two sides AGREE (equivalent) over a subscribe/set history. */
function equivalentRun(seed: string): TransitionRun {
  return {
    seed,
    history: history('subscribe', 'set', 'read', 'dispose'),
    operations: ['subscribe', 'set', 'read', 'dispose'],
    model: observed('fnv1a:0000aaaa'),
    implementation: observed('fnv1a:0000aaaa'),
  };
}

/** A run whose two sides DIFFER (divergent). */
function divergentRun(seed: string): TransitionRun {
  return {
    seed,
    history: history('subscribe', 'set', 'set', 'dispose'),
    operations: ['subscribe', 'set', 'set', 'dispose'],
    model: observed('fnv1a:11110000'),
    implementation: observed('fnv1a:22220000'),
  };
}

const OPTIONS = { family: 'cell', modelDigest: 'fnv1a:100d0000', implementationDigest: 'fnv1a:1e100000' } as const;

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
          model: observed('fnv1a:0000aaaa'),
          implementation: unevidenced('construction threw'),
        },
      ],
      OPTIONS,
    );
    const bySeed = new Map(facts.cases.map((c) => [c.seed, c]));
    expect(bySeed.get('0xeq')!.status).toBe('equivalent');
    expect(bySeed.get('0xdv')!.status).toBe('divergent');
    expect(bySeed.get('0xun')!.status).toBe('unevidenced');
    // The divergent case records BOTH observation digests (so the gate reports the replay).
    expect(bySeed.get('0xdv')!.modelObservationDigest).toBe('fnv1a:11110000');
    expect(bySeed.get('0xdv')!.implementationObservationDigest).toBe('fnv1a:22220000');
    // The traceDigest is a canonical fnv1a content address of the op history.
    expect(bySeed.get('0xeq')!.traceDigest).toMatch(/^fnv1a:[0-9a-f]{8}$/);
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
    expect(facts.modelDigest).toBe('fnv1a:100d0000');
    expect(facts.implementationDigest).toBe('fnv1a:1e100000');
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
    const findings = transitionConformanceGate.run(irlessCtx(facts));
    // The equivalent case is silent; the divergent case is a blocking L4 finding.
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.level).toBe('L4');
    expect(findings[0]!.detail).toContain('0xbad');
    expect(findings[0]!.detail).toContain('fnv1a:11110000');
    expect(findings[0]!.detail).toContain('fnv1a:22220000');
  });
});
