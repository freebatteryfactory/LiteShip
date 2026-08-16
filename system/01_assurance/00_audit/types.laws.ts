/**
 * Compile-time laws for `system/01_assurance/00_audit`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Evidence } from '../../../00_core/06_evidence/types.js';
import type { AuthorityGraph, CanonicalImport } from '../../../00_core/18_inspection/types.js';
import type { Assert, CaseOf, Equal, HoleContract, InputOf, IsExactlyTrue, NonEmptyTuple, OutputOf, SignaturesConnect, TagOf, TypeAbiAttestation, TypeAbiSurface } from '../../../types.js';
import type { WorkspaceSnapshotReference } from '../../00_workspace/types.js';
import type { AcquiredFact, AuditProbeReference, AuditProduct, ProbeCoverage, StructuralTwin, TypeProgramInterpreter } from './types.js';

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
 * An acquired fact carries no roster of who will read it.
 *
 * The deleted member is checked by name, and so are the two spellings it would
 * come back under. A reverse index inside an evidence product is a roster with
 * no relation to what it names: free to list checks outside the run, free to
 * omit checks inside it, and answerable to nothing. The relationship it claimed
 * belongs to the check's proposition, which is the one place that says what a
 * check reasons about.
 *
 * The last two lines pin what the fact does own, so this reads as a subtraction
 * rather than as a shape nobody has looked at.
 */
export type AnAcquiredFactCarriesNoConsumerRoster = Assert<
  IsExactlyTrue<
    Equal<
      [
        'consumers' extends keyof AcquiredFact ? true : false,
        'gates' extends keyof AcquiredFact ? true : false,
        'readers' extends keyof AcquiredFact ? true : false,
        Equal<AcquiredFact['value'], Evidence<ContentAddress>>,
        Equal<AcquiredFact['probe'], AuditProbeReference>,
      ],
      [false, false, false, true, true]
    >
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
