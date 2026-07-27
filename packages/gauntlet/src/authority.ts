/**
 * The authority ratchet — gates earn blocking power, they are not granted it.
 *
 * The gauntlet decides whether a release may ship, so the gauntlet is itself
 * part of the safety case and must be qualified. The rule: no gate blocks until
 * it self-proves. {@link verifyGate} runs a gate against its own red / green /
 * mutation fixtures and returns a {@link GateProof} (the receipt that it
 * executed); {@link earnedAuthority} turns that proof into the gate's tier.
 *
 * - `red` not caught → the gate cannot demonstrate catching its target.
 * - `green` not clean → the gate has a false-positive on known-good code.
 * - mutation not killed → the gate's fixtures do not actually constrain its
 *   logic (a plausible-but-wrong variant still passes them).
 *
 * Any of those failing caps the gate's SEMANTIC findings at `advisory` — a
 * gate cannot use unqualified logic to block source. The engine separately
 * treats failed qualification as an authority-integrity error: an included
 * gate that cannot prove its own detector may not mint a green run.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';
import type { Gate, GateContext, GateSubjectCoverage } from './gate.js';

/** The tiers a gate can hold. `advisory` surfaces; `blocking` fails the run. */
export type Authority = 'advisory' | 'blocking';

/** The evidence a gate produced by running against its own fixtures. */
export interface GateProof {
  readonly gateId: string;
  /** Did the red (known-bad) fixture produce ≥1 finding? */
  readonly redCaught: boolean;
  /** Did the green (known-good) fixture produce 0 findings? */
  readonly greenClean: boolean;
  /** Did mutating the gate's logic make its fixtures fail (mutation killed)? */
  readonly mutationKilled: boolean;
  /**
   * Did the gate enumerate the complete current-head population behind a
   * discrete-subject claim? `not-applicable` is engine-derived only when the
   * gate declares no separate subject census.
   */
  readonly subjectCoverage: { readonly status: 'not-applicable' } | GateSubjectCoverage;
  /** Fully self-proven iff the three fixture axes hold and subject coverage is not opaque. */
  readonly selfProven: boolean;
}

const SHA256_RECEIPT = /^sha256:[0-9a-f]{64}$/u;

function dataField(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !('value' in descriptor)) {
    throw ValidationError('verifyGate', `subjectCoverage.${key} must be an own data field`);
  }
  return descriptor.value;
}

/** Admit an immutable, exact-shape subject-coverage receipt. */
function admitSubjectCoverage(value: GateSubjectCoverage): GateSubjectCoverage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw ValidationError('verifyGate', 'subjectCoverage must be a plain record');
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw ValidationError('verifyGate', 'subjectCoverage must use a plain record prototype');
  }
  const record = value as unknown as Record<string, unknown>;
  const status = dataField(record, 'status');
  const expected =
    status === 'complete'
      ? ['censusDigest', 'enumeratedCount', 'enumerator', 'status']
      : ['censusDigest', 'enumeratedCount', 'enumerator', 'reason', 'status'];
  const actual = Object.keys(record).sort();
  if ((status !== 'complete' && status !== 'opaque') || actual.join('\u0000') !== expected.join('\u0000')) {
    throw ValidationError('verifyGate', 'subjectCoverage must be an exact complete or opaque receipt');
  }
  const enumerator = dataField(record, 'enumerator');
  const enumeratedCount = dataField(record, 'enumeratedCount');
  const censusDigest = dataField(record, 'censusDigest');
  if (typeof enumerator !== 'string' || enumerator.trim() === '') {
    throw ValidationError('verifyGate', 'subjectCoverage.enumerator must be a non-empty string');
  }
  if (!Number.isSafeInteger(enumeratedCount) || (enumeratedCount as number) < 0) {
    throw ValidationError('verifyGate', 'subjectCoverage.enumeratedCount must be a non-negative safe integer');
  }
  if (typeof censusDigest !== 'string' || !SHA256_RECEIPT.test(censusDigest)) {
    throw ValidationError('verifyGate', 'subjectCoverage.censusDigest must be a lowercase sha256 receipt');
  }
  if (status === 'complete') {
    return Object.freeze({ status, enumerator, enumeratedCount, censusDigest }) as GateSubjectCoverage;
  }
  const reason = dataField(record, 'reason');
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw ValidationError('verifyGate', 'opaque subjectCoverage.reason must be a non-empty string');
  }
  return Object.freeze({ status, enumerator, enumeratedCount, censusDigest, reason }) as GateSubjectCoverage;
}

/**
 * Run a gate against its own fixtures and return the proof. Pure: it only
 * exercises the gate's `run` over the fixtures' in-memory contexts.
 */
export function verifyGate(gate: Gate, context: GateContext = gate.fixtures.green.context): GateProof {
  const redFindings = gate.run(gate.fixtures.red.context);
  const greenFindings = gate.run(gate.fixtures.green.context);
  const redCaught = redFindings.length >= 1;
  const greenClean = greenFindings.length === 0;

  // The mutant is a plausible-but-wrong variant of the gate. Its fixtures KILL
  // it iff the mutant no longer satisfies BOTH red-catch and green-clean — i.e.
  // the fixtures detect the corruption. A mutant that still passes both means
  // the fixtures have no teeth.
  const mutant = gate.fixtures.mutation.mutate(gate);
  const mutantRedCaught = mutant.run(gate.fixtures.red.context).length >= 1;
  const mutantGreenClean = mutant.run(gate.fixtures.green.context).length === 0;
  const mutationKilled = !(mutantRedCaught && mutantGreenClean);

  const subjectCoverage =
    gate.subjectCoverage === undefined
      ? ({ status: 'not-applicable' } as const)
      : admitSubjectCoverage(gate.subjectCoverage(context));
  const selfProven = redCaught && greenClean && mutationKilled && subjectCoverage.status !== 'opaque';
  return { gateId: gate.id, redCaught, greenClean, mutationKilled, subjectCoverage, selfProven };
}

/**
 * The ratchet decision for a gate's SEMANTIC findings: a self-proven gate earns
 * `blocking`; anything else is `advisory`. The engine still fails closed on the
 * distinct authority-integrity defect, so this demotion can never turn broken
 * qualification into a green run. Finding loudness is modeled independently by
 * `Severity`; authority has only the two behaviors the engine can execute: block
 * or do not block. Any future promotion history belongs in proof receipts, not
 * as an unreachable third release behavior.
 */
export function earnedAuthority(proof: GateProof): Authority {
  return proof.selfProven ? 'blocking' : 'advisory';
}
