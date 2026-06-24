/**
 * Capsule — typed declaration of a business-logic unit that emits
 * runtime behavior plus generated tests, benches, docs, and audit
 * receipts through the czap factory.
 *
 * @module
 */

import { type Effect, Schema } from 'effect';
import type { ContentAddress } from '@czap/_spine';

/** Closed seven-arm catalog of capsule kinds. Adding an eighth requires ADR amendment. */
export type AssemblyKind =
  | 'pureTransform'
  | 'receiptedMutation'
  | 'stateMachine'
  | 'siteAdapter'
  | 'policyGate'
  | 'cachedProjection'
  | 'sceneComposition';

/** Where a capsule may run. */
export type Site = 'node' | 'browser' | 'worker' | 'edge';

/** What services a capsule reads / writes. `_R` parameter carried for type-level inference. */
export interface CapabilityDecl<_R> {
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  readonly effects?: readonly string[];
}

/** Performance + memory budgets a capsule promises to honor. */
export interface BudgetDecl {
  readonly p95Ms?: number;
  readonly memoryMb?: number;
  readonly allocClass?: 'zero' | 'bounded' | 'unbounded';
}

/** A typed invariant over input and output that the harness will check. */
export interface Invariant<In, Out> {
  readonly name: string;
  readonly check: (input: In, output: Out) => boolean;
  readonly message: string;
}

/**
 * One link in a {@link Decision}'s reason chain — a typed justification for the
 * verdict. `code` is a stable, machine-readable discriminant (e.g.
 * `'site-not-admitted'`); `message` is the human-readable explanation. A `deny`
 * carries at least one reason naming WHY the subject was rejected; an `allow`
 * may carry an informational reason naming what was admitted.
 *
 * Only meaningful for `policyGate` arms (the verdict of {@link CapsuleContract.decide}).
 */
export interface Reason {
  /** Stable, machine-readable reason discriminant (e.g. `'no-rung-admits'`). */
  readonly code: string;
  /** Human-readable explanation of this reason. */
  readonly message: string;
}

/**
 * The typed verdict a `policyGate` capsule's {@link CapsuleContract.decide}
 * resolves against a subject: an `allow`/`deny` effect plus a reason chain.
 *
 * Discipline (the policyGate analogue of the receipt byte law): a `deny` MUST
 * carry a NON-EMPTY `reasons` chain naming why the subject was rejected — a
 * denial with no reason is a silent gate, the very thing this arm exists to
 * forbid. An `allow` MAY carry informational reasons (what was admitted) or an
 * empty chain. The harness pins exactly this: `reasons` non-empty iff `deny`.
 *
 * The decision is the WHOLE authority a policyGate primitive holds — it returns
 * a verdict, it never enforces it. Side-effecting admission (refusing a request,
 * minting a token, mutating state) lives in the downstream PRODUCER that consumes
 * this verdict, never in the capsule primitive (ADR-0014 "no built-in authority",
 * consistent with the AI cast-primitive boundary).
 */
export interface Decision {
  /** Whether the subject is admitted (`allow`) or rejected (`deny`). */
  readonly effect: 'allow' | 'deny';
  /** The reason chain. Non-empty exactly when `effect === 'deny'`. */
  readonly reasons: readonly Reason[];
}

/** License and authorship metadata carried for audit receipts. */
export interface AttributionDecl {
  readonly license: string;
  readonly author: string;
  readonly url?: string;
}

/**
 * A declared fault a `receiptedMutation` capsule promises is REACHABLE — a
 * named failure mode plus a `trigger` that drives the capsule's
 * {@link CapsuleContract.mutate} handler into that fault. The harness invokes
 * `trigger` and asserts the fault actually surfaces (the handler rejects, or
 * the receipt carries the declared failure status), proving the declared
 * fault is not vaporware.
 *
 * A capsule that declares NO faults has no faults to prove reachable — the
 * harness emits no fault-injection check for it (justified non-emission, not
 * a skip). Only meaningful for `receiptedMutation` arms.
 */
export interface FaultDecl<In> {
  /** Stable identifier for the fault (e.g. `path-not-writable`). */
  readonly name: string;
  /**
   * Produce a decoded input that drives {@link CapsuleContract.mutate} into
   * this fault. Deterministic — the harness calls it once and asserts the
   * fault surfaces.
   */
  readonly trigger: () => In;
  /**
   * How the fault surfaces. `'throws'`: `mutate` rejects/throws on the
   * triggering input. `'receipt-status'`: `mutate` returns a receipt whose
   * status field equals {@link FaultDecl.status}.
   */
  readonly surfaces: 'throws' | 'receipt-status';
  /** Required when `surfaces === 'receipt-status'` — the failure status value. */
  readonly status?: string;
}

/**
 * The contract shape a capsule declaration must satisfy. The factory
 * uses this to generate tests, benches, docs, and audit receipts.
 *
 * `run` is optional: when present, the harness invokes it inside generated
 * property tests so each declared {@link Invariant} is checked against
 * real (input, output) pairs sampled from the input schema. Without `run`
 * the harness emits an `it.skip` honest-placeholder so vacuous tests can't
 * masquerade as proof.
 */
export interface CapsuleContract<K extends AssemblyKind, In, Out, R> {
  readonly _kind: K;
  readonly id: ContentAddress;
  readonly name: string;
  readonly input: Schema.Schema<In>;
  readonly output: Schema.Schema<Out>;
  readonly capabilities: CapabilityDecl<R>;
  readonly invariants: readonly Invariant<In, Out>[];
  readonly budgets: BudgetDecl;
  readonly site: readonly Site[];
  readonly attribution?: AttributionDecl;
  /**
   * Optional pure-transform handler: takes a decoded input and returns a
   * decoded output. Used by the harness to drive generated property tests
   * end-to-end. Only meaningful for `pureTransform` arms today.
   */
  readonly run?: (input: In) => Out;
  /**
   * Optional state-machine step handler: folds one decoded event (`In`)
   * into a decoded state (`Out`). With {@link CapsuleContract.initialState}
   * present, the harness drives randomized event sequences and checks every
   * declared {@link Invariant} after each step, plus deterministic replay.
   * Only meaningful for `stateMachine` arms.
   */
  readonly step?: (state: Out, event: In) => Out;
  /**
   * Optional initial state for `stateMachine` arms — the fold seed for
   * {@link CapsuleContract.step}-driven harness tests.
   */
  readonly initialState?: Out;
  /**
   * Optional projection handler for `cachedProjection` arms: derives the
   * decoded output from a decoded source. The harness checks determinism
   * (same source → deep-equal output) and every declared {@link Invariant}
   * under random sources. May be async — asset decoders
   * (`AssetDecl.decoder` and the `@czap/assets` built-ins) all return
   * Promises, so the harness awaits every probe.
   */
  readonly derive?: (source: In) => Out | Promise<Out>;
  /**
   * Optional invocation handler for `receiptedMutation` arms: applies the
   * mutation for a decoded input (`In`) and returns the decoded audit receipt
   * (`Out`). This is the typed runtime channel the harness drives to make the
   * idempotency and audit-receipt checks REAL — without it those checks have
   * nothing to invoke and the harness emits no test for them (justified
   * non-emission, not a skip).
   *
   * MUST be pure and side-effect-free over the declared input domain: the
   * harness drives it twice with the SAME sampled input and asserts the two
   * receipts are deep-equal (idempotency). A handler that writes files, spawns
   * processes, or otherwise mutates external state does NOT belong here — wire
   * such side effects behind a separate runtime callable and leave `mutate`
   * undefined (the receipt CONTRACT is still proven via the schema round-trip).
   * May be async; the harness awaits it. Only meaningful for
   * `receiptedMutation` arms.
   */
  readonly mutate?: (input: In) => Out | Promise<Out>;
  /**
   * Declared faults for `receiptedMutation` arms — failure modes the capsule
   * promises are reachable. The harness drives each fault's
   * {@link FaultDecl.trigger} through {@link CapsuleContract.mutate} and
   * asserts it surfaces as declared. Requires `mutate`. Under the mandatory
   * `mutate` requirement (see the kind-level rule below) every receipted
   * mutation with a pure core declares at least one fault — a capsule with a
   * genuinely fault-free core may declare an empty table, in which case the
   * fault-injection check is non-emitted (nothing to prove reachable). Only
   * meaningful for `receiptedMutation` arms.
   */
  readonly faults?: readonly FaultDecl<In>[];
  /**
   * The TYPED escape hatch for the `receiptedMutation` mandatory-`mutate` rule.
   *
   * Every receipted mutation MUST EITHER expose a pure {@link mutate} core (so
   * idempotency + audit-receipt + fault-injection become real, provable tests)
   * OR explicitly declare `receiptKind: 'effect-outcome'` here. A receipt that
   * is fundamentally the *outcome of an effect* — a value that only exists
   * once the side effect runs (a DOM morph's applied/failed status and live
   * timestamp; the exit code of a spawned process) — cannot be driven purely,
   * so it declares this exemption WITH a {@link reason}. The exemption is
   * machine-readable, surfaced in the generated test file, and recorded in the
   * capsule manifest — a waiver with teeth, never a silent gate-on-absence.
   *
   * `defineCapsule` REJECTS a `receiptedMutation` that has NEITHER a `mutate`
   * handler NOR this exemption (with a non-empty `reason`): the absence of a
   * pure core must be a declared, justified choice, not an oversight that ships
   * green. `'pure-core'` is the implicit default when `mutate` is present and
   * never needs to be written. Only meaningful for `receiptedMutation` arms.
   */
  readonly receiptKind?: 'pure-core' | 'effect-outcome';
  /**
   * REQUIRED when {@link receiptKind} is `'effect-outcome'` — a human-readable
   * justification for why this receipt cannot be driven by a pure core (and
   * therefore why the idempotency / audit / fault-injection checks are recorded
   * as a declared exemption rather than emitted real). Must be non-empty; the
   * harness writes it verbatim into the generated test file and the manifest.
   */
  readonly reason?: string;
  /**
   * The decision channel for `policyGate` arms: resolve an `allow`/`deny`
   * {@link Decision} (verdict + reason chain) against a decoded subject (`In`).
   * This is the typed runtime channel the harness drives to make the allow/deny
   * coverage, reason-chain integrity, and determinism checks REAL — without it a
   * `policyGate` has no decision to drive and the harness FAILS LOUD (a
   * `policyGate` MUST expose a `decide` core, enforced by `defineCapsule`).
   *
   * MUST be PURE and TOTAL over the declared subject domain (the same discipline
   * as `mutate`): the harness drives it twice with the SAME sampled subject and
   * asserts the two verdicts are deep-equal (determinism). A handler that calls a
   * provider, reads a clock, mutates state, or otherwise enforces the verdict does
   * NOT belong here — a policyGate returns a verdict, it never enforces it. Wire
   * side-effecting admission behind a separate downstream producer (ADR-0014 "no
   * built-in authority") and keep `decide` a pure verdict function.
   *
   * `Out` is the verdict shape: a `policyGate` declares `output` as the
   * {@link Decision} schema, so the generated reason-chain check decodes each
   * reason against it. Only meaningful for `policyGate` arms.
   */
  readonly decide?: (subject: In) => Decision;
}

/**
 * Runtime validator that verifies values against _spine-derived schemas.
 * Used by capsule dispatchers to check inputs before invoking handlers.
 */
export const TypeValidator = {
  validate<T>(schema: Schema.Codec<T, T, never>, value: unknown): Effect.Effect<T, Schema.SchemaError> {
    return Schema.decodeUnknownEffect(schema)(value);
  },
} as const;

export declare namespace TypeValidator {
  /** Effect returned by {@link TypeValidator.validate} on a successful decode. */
  export type Result<T> = Effect.Effect<T, Schema.SchemaError>;
}
