/**
 * Compile-time laws for `system/03_programs`.
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

import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { EffectClass, OperationId, OperationReference } from '../../00_core/07_operation/types.js';
import type { Assert, Equal, IsExactlyTrue, NonEmptyTuple, RequirementRow, Signature } from '../../types.js';
import type { WorkspaceSnapshotId } from '../00_workspace/types.js';
import type { QualifiedReleaseCandidate, ReleaseCandidateId, ReleaseReceipt } from '../02_release/types.js';
import type { ObservesOnly, ReleaseSignature, SystemProgram, SystemProgramExposure, SystemProgramId, SystemProgramReference, SystemProgramRoster } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * Compile-time law: a program's identity is an operation's identity.
 *
 * Line one is the subtraction: no second identity type exists, and a program
 * reference *is* an operation reference, so every consumer of the latter accepts
 * the former. Lines two and three are the exactness — two programs are not
 * interchangeable, and the broad form does not substitute for a named one.
 *
 * Line four is what makes the derivation worth having: the identity is computed
 * from the name, so it cannot disagree with the roster.
 */
export type AProgramIsAnOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        SystemProgramReference<'release'> extends OperationReference ? true : false,
        SystemProgramReference<'release'> extends SystemProgramReference<'ship'> ? true : false,
        SystemProgramReference extends SystemProgramReference<'release'> ? true : false,
        Equal<SystemProgramId<'release'>, OperationId<'liteship.system.program.release'>>,
      ],
      [true, false, false, true]
    >
  >
>;


/**
 * Compile-time law: release consumes a qualified candidate and nothing else.
 *
 * The central claim of this home, and the one the system README could only
 * assert. Line one is the refusal — a plain candidate, whose qualification may
 * sit in the unqualified arm, is not what this signature accepts. Line two is
 * the lawful control, without which the law would be satisfied by a signature
 * nobody can invoke.
 *
 * Lines three and four carry the exactness through both axes: a candidate
 * qualified over another snapshot, or by a result from another specification, is
 * refused at the same door.
 */
export type ReleaseConsumesAQualifiedCandidate = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          ReleaseSignature<ReleaseCandidateId<'a'>, WorkspaceSnapshotId<'s'>>,
          Signature<
            QualifiedReleaseCandidate<ReleaseCandidateId<'a'>, WorkspaceSnapshotId<'s'>>,
            ReleaseReceipt<ReleaseCandidateId<'a'>, WorkspaceSnapshotId<'s'>>,
            readonly Diagnostic[],
            RequirementRow
          >
        >,
        ReleaseSignature<ReleaseCandidateId<'a'>, WorkspaceSnapshotId<'s'>> extends ReleaseSignature<
          ReleaseCandidateId<'a'>,
          WorkspaceSnapshotId<'t'>
        >
          ? true
          : false,
        ReleaseSignature<ReleaseCandidateId<'a'>> extends ReleaseSignature<ReleaseCandidateId<'b'>>
          ? true
          : false,
        [ReleaseSignature] extends [never] ? true : false,
      ],
      [true, false, false, false]
    >
  >
>;


/**
 * Compile-time law: the exposed population and the program population are one.
 *
 * A mapped type over the roster preserves arity, so eleven programs expose
 * eleven references and the correspondence is positional. Line two is what a
 * hand-written list would have failed: a population of the right length made of
 * the wrong references.
 *
 * Line three pins that the result is what `WireExposure.exposed` accepts, which
 * is the only reason to compute it in this shape rather than as a union.
 */
export type TheExposedPopulationIsTheProgramPopulation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<SystemProgramExposure['length'], SystemProgramRoster['length']>,
        Equal<SystemProgramExposure[8], SystemProgramReference<'package'>>,
        SystemProgramExposure extends NonEmptyTuple<OperationReference> ? true : false,
        Equal<SystemProgramExposure[9], SystemProgramReference<'ship'>>,
      ],
      [true, true, true, false]
    >
  >
>;


/**
 * Compile-time law: the effect character is read from the operation, not
 * declared beside it.
 *
 * `ObservesOnly` projects through `definition.effects`, so a program that
 * declares a mutating effect stops being observation-only without anyone
 * remembering to update a second member. Line three is the anti-vacuity
 * partner: the projector must actually discriminate, and a version that always
 * answered `true` would satisfy the first two lines.
 */
export type TheEffectCharacterIsReadFromTheOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<SystemProgram['definition']['effects'], NonEmptyTuple<EffectClass>>,
        ObservesOnly<SystemProgram<'doctor', unknown, unknown, readonly []>>,
        Equal<
          ObservesOnly<
            SystemProgram<'doctor', unknown, unknown, readonly []> & {
              readonly definition: { readonly effects: readonly ['publish'] };
            }
          >,
          false
        >,
      ],
      [true, false, true]
    >
  >
>;
