/**
 * Gauntlet: evidence evaluation and earned authority.
 *
 * Gauntlet reads facts and produces findings, verdicts, and the authority a
 * release is allowed to consume. It acquires nothing: no compiler lane, no
 * filesystem, no source control appears in this file, which is why it can run
 * anywhere the audit product can be shipped.
 *
 * One idea from the deleted harness survives here, and only one. Five hundred
 * and seventy-one mutation scripts and a bespoke runner were an
 * implementation, and implementations are quarry. The durable relation they
 * were reaching for is that **a gate cannot earn authority until evidence
 * shows it detects the failure class it claims**, because this repository has
 * repeatedly written guards that pass with the guard removed. The umbrella
 * carries that as `GateQualification` and `DetectionWitness`; this home is
 * where a definition binds its claim to its evaluation.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Envelope,
  NonEmptyTuple,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Evidence } from '../../../00_core/06_evidence/types.js';
import type { WorkspaceSnapshotReference } from '../../00_workspace/types.js';
import type {
  AssuranceAuthority,
  AssuranceFactName,
  AssuranceProposition,
  Finding,
  FailureClassReference,
  GateDisposition,
  GateId,
  GateOutcome,
  GateQualification,
  GateReference,
  GateScope,
} from '../types.js';

// ---------------------------------------------------------------------------
// Evidence profiles
// ---------------------------------------------------------------------------

/**
 * How much evidence a run had available.
 *
 * `lean` is a pre-commit or editor context where the compiler lane is not
 * worth paying for; `rich` is a full audit. The distinction is declared rather
 * than inferred so that a gate needing rich evidence under a lean run resolves
 * to indeterminate — visible, and blocking if its disposition says so —
 * instead of silently not running. Silently not running is how a checked
 * repository becomes an unchecked one without anybody deciding to.
 */
export type EvidenceProfile = 'lean' | 'rich';

// ---------------------------------------------------------------------------
// Gate definitions
// ---------------------------------------------------------------------------

/**
 * One gate: what it covers, what it reads, what it concludes, and what it
 * claims to catch.
 *
 * `reads` is non-empty because a gate with no inputs decides nothing and
 * cannot fail — the pure form of the vacuity this repository keeps rediscovering
 * in its own laws.
 *
 * `claims` is non-empty because qualification compares a claim to a witness. A
 * gate that claims nothing can never be refuted, which makes it permanently
 * unqualifiable rather than trivially trustworthy.
 */
export interface GateDefinition<Id extends GateId = GateId> {
  readonly gate: GateReference<Id>;
  readonly scope: GateScope;
  readonly reads: NonEmptyTuple<AssuranceFactName>;
  readonly proposition: AssuranceProposition;
  readonly disposition: GateDisposition;
  readonly claims: NonEmptyTuple<FailureClassReference>;
  readonly requires: EvidenceProfile;
}

/**
 * One gate evaluated against one snapshot.
 *
 * The facts actually read are recorded beside the outcome, so a conclusion can
 * be traced to its inputs rather than believed. `Evidence` is retained rather
 * than unwrapped: a gate that concluded from an unavailable fact is a
 * different event than one that concluded from a present one.
 */
export interface GateEvaluation<Id extends GateId = GateId> {
  readonly definition: GateDefinition<Id>;
  readonly outcome: GateOutcome;
  readonly read: readonly { readonly fact: AssuranceFactName; readonly value: Evidence<ContentAddress> }[];
  readonly qualification: GateQualification;
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

/**
 * The conclusion of one gauntlet run.
 *
 * `blocked` carries the evaluations that blocked, so a refusal names its
 * causes and cannot be a bare exit code. There is no arm meaning "passed with
 * known problems": a blocking gate that refuted or could not resolve produces
 * `blocked`, and advisory findings ride along inside `passed` where they
 * belong.
 */
export type GauntletVerdict = Algebra<{
  passed: { readonly advisories: readonly Finding[] };
  blocked: { readonly blocking: NonEmptyTuple<GateEvaluation>; readonly diagnostics: readonly Diagnostic[] };
}>;

/**
 * The product of one gauntlet run.
 *
 * `authority` is the umbrella's algebra, so a run that produced no qualified
 * gate yields `unearned` with a reason rather than a quietly absent member.
 */
export type GauntletRun = Envelope<
  'LiteShipGauntletRun',
  1,
  {
    readonly snapshot: WorkspaceSnapshotReference;
    readonly profile: EvidenceProfile;
    readonly evaluations: readonly GateEvaluation[];
    readonly verdict: GauntletVerdict;
    readonly authority: AssuranceAuthority;
    readonly address: ContentAddress<'application/vnd.liteship.gauntlet-run+cbor'>;
  }
>;

/** Identity of a consumer-supplied gate, so extension uses the same path. */
export type ConsumerGateId<Name extends string = string> = Brand<Name, 'liteship.consumer-gate-id'>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * A gate reads something and claims something.
 *
 * Both negative lines matter. Widening either population to a plain array
 * admits the empty case, and the empty case is a gate that cannot fail — which
 * is indistinguishable from a gate that never fires, and is exactly the state
 * every vacuous law in this repository has been in.
 */
export type AGateReadsEvidenceAndClaimsDetection = Assert<
  Equal<
    [
      Equal<GateDefinition['reads'], NonEmptyTuple<AssuranceFactName>>,
      readonly AssuranceFactName[] extends GateDefinition['reads'] ? true : false,
      Equal<GateDefinition['claims'], NonEmptyTuple<FailureClassReference>>,
      readonly FailureClassReference[] extends GateDefinition['claims'] ? true : false,
    ],
    [true, false, true, false]
  >
>;

/**
 * A verdict is passed or blocked, with nothing in between.
 *
 * The absent third arm is the law. `passed-with-warnings` is the shape that
 * turns a blocking gate into a suggestion over time, and its absence is
 * checked rather than described.
 */
export type AVerdictHasNoMiddleArm = Assert<
  Equal<
    [
      Equal<TagOf<GauntletVerdict>, 'passed' | 'blocked'>,
      'passed-with-warnings' extends TagOf<GauntletVerdict> ? true : false,
      'degraded' extends TagOf<GauntletVerdict> ? true : false,
      Equal<CaseOf<GauntletVerdict, 'blocked'>['blocking'], NonEmptyTuple<GateEvaluation>>,
    ],
    [true, false, false, true]
  >
>;

/**
 * A gate definition is exact over its identity.
 *
 * The third line is the anti-vacuity partner: without it the law passes when
 * the evaluation stops threading the parameter through, which is the erasure
 * defect the host layer paid four folds to close.
 */
export type AGateDefinitionIsExactOverItsIdentity = Assert<
  Equal<
    [
      GateDefinition<GateId<'a'>> extends GateDefinition<GateId<'b'>> ? true : false,
      GateDefinition<GateId<'a'>> extends GateDefinition<GateId<'a'>> ? true : false,
      GateEvaluation<GateId<'a'>> extends GateEvaluation<GateId<'b'>> ? true : false,
      GateEvaluation extends GateEvaluation<GateId<'a'>> ? true : false,
    ],
    [false, true, false, false]
  >
>;

/**
 * Gauntlet acquires nothing.
 *
 * A run carries no surface, no graph, no probe, and no interpreter. If any of
 * these appears the split has collapsed and the heaviest dependency in the
 * repository has followed evaluation everywhere it goes.
 */
export type AGauntletRunAcquiresNothing = Assert<
  Equal<
    [
      'surfaces' extends keyof GauntletRun ? true : false,
      'graph' extends keyof GauntletRun ? true : false,
      'probes' extends keyof GauntletRun ? true : false,
      'interpreter' extends keyof GauntletRun ? true : false,
      'files' extends keyof GauntletRun ? true : false,
    ],
    [false, false, false, false, false]
  >
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the assurance topology. */
export interface GauntletTypeSurface {
  readonly definition: GateDefinition;
  readonly evaluation: GateEvaluation;
  readonly profile: EvidenceProfile;
  readonly verdict: GauntletVerdict;
  readonly run: GauntletRun;
  readonly consumerGate: ConsumerGateId;
}
