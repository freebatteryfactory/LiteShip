/**
 * Audit: evidence acquisition.
 *
 * Audit reads. It opens the type program, walks the source homes, resolves
 * imports, canonicalizes the public surface, and hands the result to gauntlet.
 * It decides nothing — no gate, no verdict, no authority appears in this file.
 *
 * The split from `01_gauntlet` is not tidiness. Acquisition needs a compiler
 * lane, a filesystem, and source control; evaluation needs none of those and
 * runs anywhere the facts can be shipped. Fusing them would drag the heaviest
 * dependency in the repository into every place a decision is read.
 *
 * What audit is emphatically not allowed to do is invent vocabulary that
 * already has an owner. `TypeAbiSurface` and `TypeAbiAttestation` are root's.
 * `AuthorityGraph`, `AuthorityRecord`, and `CanonicalImport` are
 * `00_core/18_inspection`'s, whose module comment already assigns their
 * production to system assurance. Audit *produces* those types. A local
 * structural twin of any of them would be the exact defect this home exists
 * to detect, committed by the detector.
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
  Hole,
  HoleContract,
  InputOf,
  IsExactlyTrue,
  NonEmptyTuple,
  OutputOf,
  SignaturesConnect,
  Reference,
  Signature,
  TagOf,
  TypeAbiAttestation,
  TypeAbiSurface,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Evidence } from '../../../00_core/06_evidence/types.js';
import type {
  AuthorityGraph,
  AuthorityReference,
  CanonicalImport,
} from '../../../00_core/18_inspection/types.js';
import type { WorkspaceSnapshotReference } from '../../00_workspace/types.js';
import type { AssuranceFactName, AssuranceSubject, GateReference } from '../types.js';

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type AuditProbeId<Name extends string = string> = Brand<Name, 'liteship.audit-probe-id'>;
export type AuditProbeReference<Id extends AuditProbeId = AuditProbeId> = Reference<
  'audit-probe',
  Id
>;

/**
 * One fact acquired about one subject.
 *
 * `consumers` is non-empty and required, which makes an orphan fact
 * unrepresentable. The rule it encodes — every produced fact has a consumer —
 * is the only defence against the failure mode acquisition always drifts into:
 * a growing pile of interesting measurements nobody reads, which looks like
 * thoroughness and costs like a subsystem.
 *
 * The value is `Evidence`, not a bare value, so a probe that ran and found
 * nothing, a probe that could not run, and a probe that failed remain three
 * distinct states all the way to the consumer.
 */
export interface AcquiredFact<Value = ContentAddress> {
  readonly fact: AssuranceFactName;
  readonly subject: AssuranceSubject;
  readonly value: Evidence<Value>;
  readonly probe: AuditProbeReference;
  readonly consumers: NonEmptyTuple<GateReference>;
}

/**
 * Two declarations that are structurally identical and differently sourced.
 *
 * TypeScript considers an imported authority and a local copy of the same
 * shape to be the same type, which is precisely why provenance cannot be
 * decided by assignability and why this home exists at all. The observation
 * belongs to audit; whether it is a defect is a gate's call, because a
 * deliberate re-export and a smuggled twin have the same shape and different
 * meanings.
 */
export interface StructuralTwin {
  readonly canonical: AuthorityReference;
  readonly twin: AuthorityReference;
  readonly canonicalImport: CanonicalImport;
  readonly observedImport: Evidence<CanonicalImport>;
}

/**
 * Whether the probe population ran to completion.
 *
 * A probe that could not run is named here rather than dropped. The deleted
 * control plane's most expensive habit was reporting on the subset it managed
 * to reach, which reads downstream as a clean result.
 */
export type ProbeCoverage = Algebra<{
  complete: Record<never, never>;
  partial: {
    readonly unrun: NonEmptyTuple<AuditProbeReference>;
    readonly diagnostics: readonly Diagnostic[];
  };
}>;

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * Interpreting TypeScript is an injected capability with a named lane.
 *
 * The root toolchain policy assigns roles, and `semantic-abi` and
 * `analysis-api` may live on a different lane than `primary-check` for as long
 * as the native compiler exposes no *stable* programmatic API. Precision
 * matters here because the looser claim is false: 7.0.2 ships
 * `typescript/unstable/*` including a `Checker`, and `unstable` is the vendor's
 * own word. The retirement trigger is stability, not existence. What must not happen again is the
 * previous response to the gap: hand-rolled lexical scanning over stripped
 * comments, which is a second parser with none of a parser's guarantees.
 *
 * Requiring the interpreter as a hole means an implementation that wants to
 * read source has to name the lane it read with, and the attestation it
 * produces carries that lane's fingerprint.
 */
export type TypeProgramInterpreter = Hole<
  'liteship.system.audit.type-program',
  {
    readonly surface: Signature<WorkspaceSnapshotReference, TypeAbiSurface, readonly Diagnostic[]>;
    readonly attest: Signature<TypeAbiSurface, TypeAbiAttestation, readonly Diagnostic[]>;
  }
>;

/** Resolving what a specifier actually names, which text matching cannot do. */
export type ImportResolver = Hole<
  'liteship.system.audit.import-resolver',
  {
    readonly resolve: Signature<CanonicalImport, AuthorityReference, readonly Diagnostic[]>;
  }
>;

/** The exact prerequisite row for one audit run. */
export type AuditRequirements = readonly [TypeProgramInterpreter, ImportResolver];

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

/**
 * Everything one audit run acquired about one snapshot.
 *
 * Every member is a type owned upstream, assembled here. That is the whole
 * shape of this home: audit is a producer of other people's vocabulary.
 */
export type AuditProduct = Envelope<
  'LiteShipAuditProduct',
  1,
  {
    readonly snapshot: WorkspaceSnapshotReference;
    readonly surfaces: readonly TypeAbiSurface[];
    readonly attestations: readonly TypeAbiAttestation[];
    readonly graph: AuthorityGraph;
    readonly twins: readonly StructuralTwin[];
    readonly facts: readonly AcquiredFact[];
    readonly coverage: ProbeCoverage;
    readonly address: ContentAddress<'application/vnd.liteship.audit-product+cbor'>;
  }
>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * The interpreter's two operations compose, in that order.
 *
 * Both were declared backwards: `surface` said "give me a surface and I will
 * return a snapshot reference", `attest` said "give me an attestation and I
 * will return a surface." Both are legal `Signature` instantiations, so nothing
 * objected.
 *
 * The first two lines pin each end as an ordered pair, which is what a reversal
 * breaks. The third is the one that is not restatement: `SignaturesConnect`
 * asks whether `surface`'s output can actually feed `attest`'s input — a real
 * composition question, and the reason this pair exists at all. A snapshot is
 * canonicalized into a surface, and that surface is what gets attested. If
 * either operation flips, the pipeline stops connecting and the third line goes
 * false independently of the first two.
 *
 * `SignaturesConnect` is consumed by `ComposeSignatures` in the root calculus and
 * tested directly in `types.laws.ts`. This is its first consumer in an authored
 * home, which is a weaker and truer claim than the one that stood here.
 */
export type TheInterpreterCanonicalizesThenAttests = Assert<
  IsExactlyTrue<
    Equal<
      [
        [InputOf<HoleContract<TypeProgramInterpreter>['surface']>, OutputOf<HoleContract<TypeProgramInterpreter>['surface']>],
        [InputOf<HoleContract<TypeProgramInterpreter>['attest']>, OutputOf<HoleContract<TypeProgramInterpreter>['attest']>],
        SignaturesConnect<HoleContract<TypeProgramInterpreter>['surface'], HoleContract<TypeProgramInterpreter>['attest']>,
      ],
      [
        [WorkspaceSnapshotReference, TypeAbiSurface],
        [TypeAbiSurface, TypeAbiAttestation],
        true,
      ]
    >
  >
>;

/**
 * Every acquired fact names at least one consumer.
 *
 * Line two is the one that survives review: making `consumers` a plain array
 * is a natural-looking edit that reintroduces the orphan fact, and only the
 * negative assertion catches it.
 */
export type AnAcquiredFactNamesItsConsumers = Assert<
  Equal<
    [
      Equal<AcquiredFact['consumers'], NonEmptyTuple<GateReference>>,
      readonly GateReference[] extends AcquiredFact['consumers'] ? true : false,
      undefined extends AcquiredFact['consumers'] ? true : false,
    ],
    [true, false, false]
  >
>;

/**
 * Audit produces upstream vocabulary and declares no twin of it.
 *
 * Checked structurally against the owners rather than by name. A local
 * interface called `AuditAuthorityGraph` with the same members would pass a
 * name check and fail this one, which is the right way round: this home's
 * entire subject is that structural identity does not imply shared provenance.
 */
export type AuditProducesUpstreamVocabulary = Assert<
  Equal<
    [
      Equal<AuditProduct['graph'], AuthorityGraph>,
      Equal<AuditProduct['surfaces'], readonly TypeAbiSurface[]>,
      Equal<AuditProduct['attestations'], readonly TypeAbiAttestation[]>,
      Equal<StructuralTwin['canonicalImport'], CanonicalImport>,
    ],
    [true, true, true, true]
  >
>;

/**
 * Audit decides nothing.
 *
 * The product carries no verdict, no finding, no authority, and no gate
 * outcome. These are checked by name because that is exactly how the boundary
 * erodes — one convenience member at a time, each individually reasonable.
 */
export type AnAuditProductCarriesNoVerdict = Assert<
  Equal<
    [
      'verdict' extends keyof AuditProduct ? true : false,
      'findings' extends keyof AuditProduct ? true : false,
      'authority' extends keyof AuditProduct ? true : false,
      'outcome' extends keyof AuditProduct ? true : false,
      'passed' extends keyof AuditProduct ? true : false,
    ],
    [false, false, false, false, false]
  >
>;

/**
 * A probe that could not run stays visible.
 *
 * The coverage algebra has no arm meaning "everything relevant ran", and the
 * fact value is `Evidence`, so unavailability is representable at both the run
 * level and the individual fact level.
 */
export type UnrunProbesRemainVisible = Assert<
  Equal<
    [
      Equal<TagOf<ProbeCoverage>, 'complete' | 'partial'>,
      Equal<CaseOf<ProbeCoverage, 'partial'>['unrun'], NonEmptyTuple<AuditProbeReference>>,
      Equal<AcquiredFact['value'], Evidence<ContentAddress>>,
      'skipped' extends TagOf<ProbeCoverage> ? true : false,
    ],
    [true, true, true, false]
  >
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the assurance topology. */
export interface AuditTypeSurface {
  readonly probe: AuditProbeReference;
  readonly fact: AcquiredFact;
  readonly twin: StructuralTwin;
  readonly coverage: ProbeCoverage;
  readonly interpreter: TypeProgramInterpreter;
  readonly product: AuditProduct;
}
