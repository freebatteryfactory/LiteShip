/**
 * Traceability facts — the pre-computed, host-built evidence the
 * {@link traceabilityBridgeGate} folds into {@link Finding}s (the avionics-tier
 * requirements-traceability ledger, DO-178B-style).
 *
 * This module defines the {@link TraceabilityFacts} INTERFACE + the resolved-state
 * `_tag` union and NOTHING else. Like {@link RepoIR}, {@link SupplyChainFacts}, and
 * {@link MutationFacts}, it carries NO heavy dependency: `@czap/gauntlet` stays the
 * lean engine, so it never parses YAML, never scans the test corpus, and never reads
 * a wall clock. A HOST (the CLI's `packages/cli/src/lib/traceability.ts` state
 * machine) does the heavy lifting — parse `traceability/*.yaml`, scan the test corpus
 * for `// PROVES:` headers, run the lifecycle fold against the injected wall-clock
 * date, content-address the resolved ledger — and hands the engine these flat,
 * already-decided facts. The gate's only job is to FOLD them into Findings at each
 * invariant's level (ADR-0012: the lean engine folds facts; the host computes them).
 *
 * THE BIG IDEA. Every system INVARIANT (a LAW — determinism / CRDT convergence /
 * content-address identity / assurance propagation / hermeticity) must be TRACED to
 * a proving test or covered by a waiver-with-teeth. An UNTRACED invariant, an EXPIRED
 * waiver, or a ledger⇔header DIVERGENCE is a hole in the safety case — a self-
 * explaining Finding at the invariant's level (hard-fail for L3/L4). REPORT-not-
 * DECIDE: the host decides each invariant's resolved state; the gate reports it.
 *
 * Composition, not inheritance: a resolved state is a `_tag` data record, never a
 * class hierarchy; the lifecycle is standalone functions in the host.
 *
 * @module
 */

import type { AssuranceLevel } from './assurance.js';

/**
 * The lifecycle state of one invariant — a `_tag` union, the deterministic fold's
 * output. The host's pure state machine assigns exactly one of these per declared
 * invariant; the gate folds on the `_tag`.
 *
 * - `proven`: a claimed proving test EXISTS and carries a matching `PROVES` header.
 *   (`DECLARED → TRACED → PROVEN` — the happy path. No finding.)
 * - `untraced`: declared, but no proof AND no waiver covers it. → a finding at the
 *   invariant's level (hard-fail for L3/L4).
 * - `waived`: a non-expired, owner-signed waiver covers a not-yet-traced invariant.
 *   No finding (an honest, time-boxed deferral with teeth).
 * - `expired`: a waiver covered it but its expiry is past the injected wall-clock
 *   date — the debt came due. → a finding (the waiver lost its teeth).
 */
export type InvariantState = InvariantProven | InvariantUntraced | InvariantWaived | InvariantExpired;

/** PROVEN — a claimed test exists and carries the matching `PROVES` header. */
export interface InvariantProven {
  readonly _tag: 'proven';
  /** The proving-test refs (`file::test-name`) that PROVE this invariant. */
  readonly provingTests: readonly string[];
}

/** UNTRACED — declared, no proof, no waiver. A finding. */
export interface InvariantUntraced {
  readonly _tag: 'untraced';
  /** Why it is untraced — the human-readable WHY for the finding. */
  readonly reason: string;
}

/** WAIVED — a non-expired waiver covers a not-yet-traced invariant. */
export interface InvariantWaived {
  readonly _tag: 'waived';
  readonly owner: string;
  readonly justification: string;
  /** The waiver's expiry (ISO `yyyy-mm-dd`) — past the wall-clock date ⇒ `expired`. */
  readonly expiry: string;
}

/** EXPIRED — a waiver covered it but its expiry is past `now`. A finding. */
export interface InvariantExpired {
  readonly _tag: 'expired';
  readonly owner: string;
  readonly justification: string;
  readonly expiry: string;
}

/** One declared invariant + its resolved lifecycle state (the gate's fold unit). */
export interface ResolvedInvariant {
  /** The stable INV-* id (the head-probe key the `PROVES` headers name). */
  readonly id: string;
  /** The LAW this invariant upholds (one line). */
  readonly law: string;
  /** The assurance level — an untraced/expired L3/L4 invariant HARD-FAILS. */
  readonly level: AssuranceLevel;
  /** The grouping category (determinism | crdt | content-address | …). */
  readonly category: string;
  /** The resolved lifecycle state — the deterministic fold's verdict. */
  readonly state: InvariantState;
}

/**
 * A ledger⇔header DIVERGENCE — the two halves of the bidirectional trace disagree.
 * Either a test `PROVES` an INV absent from the ledger (`undeclared-proof`), or a
 * ledger entry claims a test whose header does NOT name the invariant
 * (`unbacked-claim`). Both are findings (the ledger and the tests must agree — the
 * head-probe LAW).
 */
export interface TraceabilityDivergence {
  /**
   * `undeclared-proof`: a `PROVES: INV-X` header names an INV not in invariants.yaml.
   * `unbacked-claim`:   a ledger `tests:` ref points at a test whose header does not
   *                     name this invariant (a hardcoded claim diverged from the live
   *                     header).
   * `missing-test`:     a ledger `tests:` ref points at a test that does not exist in
   *                     the corpus (the claimed proof is absent).
   */
  readonly kind: 'undeclared-proof' | 'unbacked-claim' | 'missing-test';
  /** The invariant id the divergence concerns. */
  readonly invariantId: string;
  /** Human-readable WHY — enough to act on without re-reading the ledger. */
  readonly detail: string;
  /** The artifact the divergence points at (a test ref or the ledger entry). */
  readonly subject: string;
}

/**
 * The host-supplied traceability evidence over one run — every declared invariant's
 * resolved state, every detected ledger⇔header divergence, and the content address
 * of the resolved ledger (so DRIFT in the resolved trace is itself detectable).
 *
 * The whole capability is OPTIONAL on the {@link GateContext}: a lean run (no host)
 * leaves it ABSENT and the bridge gate is simply not in the set — no YAML parse, no
 * corpus scan, no cost. When PRESENT, the gate folds it into Findings.
 */
export interface TraceabilityFacts {
  /** Every declared invariant + its resolved lifecycle state (sorted by id). */
  readonly invariants: readonly ResolvedInvariant[];
  /** Every ledger⇔header divergence (sorted) — the bidirectional-trace check. */
  readonly divergences: readonly TraceabilityDivergence[];
  /**
   * The content address (fnv1a over the canonical resolved ledger) the host minted —
   * the drift keystone. Two runs over the same ledger+corpus+date produce the same
   * address; a change re-addresses. Carried for the report/receipt, not the verdict.
   */
  readonly ledgerAddress: string;
}
