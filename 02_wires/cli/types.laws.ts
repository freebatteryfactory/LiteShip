/**
 * Compile-time laws for `02_wires/cli`.
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
import type { OperationId, OperationOutcome } from '../../00_core/07_operation/types.js';
import type { MigrationFailure, MigrationReport } from '../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, IsExactlyTrue, NonEmptyTuple, TagOf } from '../../types.js';
import type { CliDisposition, CliExit, CliMigrationDisposition, CliOutput, CliStream } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type CliLawA = OperationId<'liteship.wire.cli.law.op-a'>;

type CliLawB = OperationId<'liteship.wire.cli.law.op-b'>;


/**
 * Compile-time law: the exit is a projection of the operation's outcome.
 *
 * The previous law checked cross-arm exclusion only — that a crossing which
 * never ran, and one whose answer was lost, could not reach `success`. Both
 * true, both pinned by their arms carrying a single literal exit, and neither
 * says anything about the arm where an operation actually ran. That arm carried
 * any completed receipt beside a freely chosen exit, so a receipt reading
 * `failed` and an exit reading `success` composed without complaint.
 *
 * Lines one through four pin each completed arm's exit to the one honest
 * answer for its outcome. Lines five and six are the refusals that matter most:
 * `success` is not reachable from the failed arm or the cancelled arm, which is
 * the sentence the whole file was written to be able to say. Lines seven and
 * eight keep the old cross-arm refusals. Line nine is the anti-vacuity partner
 * — a disposition that had quietly resolved to `never` would satisfy every
 * refusal above and prove nothing.
 */
export type TheExitIsAProjectionOfTheOperationOutcome = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<CliDisposition, 'succeeded'>['exit'], CaseOf<CliExit, 'success'>>,
        Equal<
          CaseOf<CliDisposition, 'refusedByOperation'>['exit'],
          CaseOf<CliExit, 'refusedByOperation'>
        >,
        Equal<CaseOf<CliDisposition, 'failed'>['exit'], CaseOf<CliExit, 'failed'>>,
        Equal<CaseOf<CliDisposition, 'cancelled'>['exit'], CaseOf<CliExit, 'cancelled'>>,
        CaseOf<CliExit, 'success'> extends CaseOf<CliDisposition, 'failed'>['exit']
          ? true
          : false,
        CaseOf<CliExit, 'success'> extends CaseOf<CliDisposition, 'cancelled'>['exit']
          ? true
          : false,
        CaseOf<CliExit, 'success'> extends CaseOf<CliDisposition, 'rejected'>['exit']
          ? true
          : false,
        CaseOf<CliExit, 'success'> extends CaseOf<CliDisposition, 'interrupted'>['exit']
          ? true
          : false,
        [CaseOf<CliDisposition, 'failed'>] extends [never] ? true : false,
      ],
      [true, true, true, true, false, false, false, false, false]
    >
  >
>;

/**
 * Compile-time law: a stricter wire threshold never rewrites a successful
 * operation as a failed one.
 *
 * Doctor strict mode is the first consumer. Its report remains on the answer
 * stream and its receipt remains `succeeded`; only the CLI exit arm records
 * that the caller-selected acceptance threshold was not met.
 */
export type AWireThresholdPreservesTheSuccessfulOutcome = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<CliDisposition, 'threshold'>['crossing']['receipt']['outcome'],
          CaseOf<OperationOutcome, 'succeeded'>
        >,
        Equal<CaseOf<CliDisposition, 'threshold'>['exit'], CaseOf<CliExit, 'threshold'>>,
        CaseOf<CliExit, 'threshold'> extends CaseOf<CliDisposition, 'failed'>['exit']
          ? true
          : false,
      ],
      [true, true, false]
    >
  >
>;


/**
 * Compile-time law: a completed arm carries the receipt outcome it names.
 *
 * The exit law above pins one half of the relation. This pins the other: the
 * failed arm's crossing carries a receipt whose outcome is the failed arm of
 * `OperationOutcome`, and a succeeded receipt cannot be placed in it. Without
 * this, every disposition arm could still carry any completed crossing and the
 * exit constraint would be pinning an exit to a transport that never said what
 * happened.
 *
 * Line three is the anti-vacuity partner.
 */
export type ACompletedArmCarriesTheOutcomeItNames = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<CliDisposition, 'failed'>['crossing']['receipt']['outcome'],
          CaseOf<OperationOutcome, 'failed'>
        >,
        Equal<
          CaseOf<CliDisposition, 'succeeded'>['crossing']['receipt']['outcome'],
          CaseOf<OperationOutcome, 'succeeded'>
        >,
        [CaseOf<CliDisposition, 'succeeded'>['crossing']] extends [never] ? true : false,
      ],
      [true, true, false]
    >
  >
>;


/**
 * Compile-time law: the answer and the diagnostics are on different streams.
 *
 * Both members pin their stream to a literal, so a diagnostic cannot be placed
 * on the answer stream by construction rather than by a convention somebody
 * remembers at three in the morning. Line three is the anti-vacuity partner: if
 * `CliStream` collapsed to a single value the first two lines would still pass
 * while the distinction had ceased to exist.
 */
export type TheAnswerAndTheDiagnosticsDoNotShareAStream = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CliOutput['answer']['stream'], 'answer'>,
        Equal<CliOutput['diagnostics']['stream'], 'diagnostic'>,
        Equal<CliStream, 'answer' | 'diagnostic'>,
        CliStream extends CliOutput['answer']['stream'] ? true : false,
      ],
      [true, true, true, false]
    >
  >
>;


/**
 * Compile-time law: a refusal by the operation is not a usage error.
 *
 * Collapsing `refusedByOperation` into `usage` is the ordinary shape — one
 * nonzero code for everything that is not success — and it tells a user who
 * typed a correct command that they typed it wrong.
 *
 * The exit population is four operation outcomes, two boundary outcomes, and
 * one caller-selected answer threshold. The outcome algebra is pinned
 * alongside, because the first four exist
 * to project it — if `OperationOutcome` grows a fifth arm, this law goes red
 * and the question of what a command should exit with becomes visible rather
 * than being answered by whichever arm happens to be assignable.
 */
export type ARefusalByTheOperationIsNotAUsageError = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          TagOf<CliExit>,
          | 'success'
          | 'refusedByOperation'
          | 'failed'
          | 'cancelled'
          | 'usage'
          | 'interrupted'
          | 'threshold'
        >,
        Equal<TagOf<OperationOutcome>, 'succeeded' | 'failed' | 'refused' | 'cancelled'>,
        CaseOf<CliExit, 'success'> extends CaseOf<CliExit, 'refusedByOperation'> ? true : false,
        Equal<CaseOf<CliExit, 'refusedByOperation'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
        CaseOf<CliExit, 'failed'> extends CaseOf<CliExit, 'cancelled'> ? true : false,
      ],
      [true, true, false, true, false]
    >
  >
>;


/**
 * Compile-time law: a disposition is exact over the operation it reports on.
 *
 * The third line is the anti-vacuity partner for the carrier dropping its
 * parameter, which is the defect this repository keeps committing and now
 * checks by hand in every exactness law.
 */
export type ACliDispositionIsExactOverItsOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        CliDisposition<unknown, readonly Diagnostic[], CliLawA> extends CliDisposition<
          unknown,
          readonly Diagnostic[],
          CliLawB
        >
          ? true
          : false,
        CliDisposition<unknown, readonly Diagnostic[], CliLawA> extends CliDisposition<
          unknown,
          readonly Diagnostic[],
          CliLawA
        >
          ? true
          : false,
        CliDisposition extends CliDisposition<unknown, readonly Diagnostic[], CliLawA>
          ? true
          : false,
      ],
      [false, true, false]
    >
  >
>;

export type CliMigrationProjectsTheCoreContract = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<CliMigrationDisposition<CliLawA>, 'failed'>['crossing']['receipt']['outcome'],
          CaseOf<OperationOutcome<MigrationReport, MigrationFailure>, 'failed'>
        >,
        CliMigrationDisposition<CliLawA> extends CliMigrationDisposition<CliLawB> ? true : false,
      ],
      [true, false]
    >
  >
>;
