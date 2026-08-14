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
  Brand,
  Envelope,
  Hole,
  NonEmptyTuple,
  Reference,
  Signature,
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
import type { WorkspaceSnapshotId, WorkspaceSnapshotReference } from '../../00_workspace/types.js';
import type { AssuranceFactName, AssuranceSubject } from '../types.js';

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
 * There is no `consumers` member. It was a non-empty tuple of gate references
 * meant to make an orphan fact unrepresentable, and it was a reverse index
 * embedded in the evidence product: a roster naming gates it had no relation to,
 * free to name checks outside the run and to omit checks inside it. Its only
 * reader was its own law.
 *
 * It also sat opposite `GateDefinition.reads`, deleted in the same commit — one
 * relationship written from both directions and traversed from neither. The
 * single remaining declaration is the check's proposition, which already names
 * the facts and subjects it reasons about. A data-defined check cannot secretly
 * read undeclared evidence, because there is no arbitrary body in which to hide
 * the read.
 *
 * The rule that roster was reaching for — every produced fact has a consumer —
 * is real and survives as an audit obligation rather than as a member that
 * asserts itself.
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
export type TypeProgramInterpreter<Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId> = Hole<
  'liteship.system.audit.type-program',
  {
    readonly surface: Signature<
      WorkspaceSnapshotReference<Snapshot>,
      TypeAbiSurface,
      readonly Diagnostic[]
    >;
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

/**
 * The exact prerequisite row an audit run needs before it can read anything.
 *
 * This existed once and was deleted for having no consumer: it was declared as
 * "the exact prerequisite row for one audit run" and was never a requirement
 * row on any signature, because no audit signature existed. Deleting it was
 * right, and it returns now for the only reason a declaration should — the
 * concrete `audit` program names it, so there is a signature to be the
 * requirement row of.
 */
export type AuditRequirements<Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId> = readonly [
  TypeProgramInterpreter<Snapshot>,
  ImportResolver,
];

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

/**
 * Everything one audit run acquired about one snapshot.
 *
 * Every member is a type owned upstream, assembled here. That is the whole
 * shape of this home: audit is a producer of other people's vocabulary.
 */
export type AuditProduct<Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId> = Envelope<
  'LiteShipAuditProduct',
  1,
  {
    readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
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
