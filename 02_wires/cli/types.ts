/**
 * The CLI wire: argv in, two streams and an exit code out.
 *
 * This is the wire the repository's own programs cross, which makes it the one
 * place the dogfooding claim is either true or a slogan. `WireCaller` has an
 * arm for a system program and confers nothing; here is where that has to hold,
 * because here is where the temptation is strongest to give `release` a shorter
 * path than an application operation gets.
 *
 * Two facts have no owner upstream and both are ways this boundary lies by
 * default.
 *
 * **The exit code is one integer asked to carry two questions.** Did the
 * crossing work, and did the operation approve? A shell sees `0` and continues.
 * So `0` must be unreachable from a crossing that never became an invocation
 * and from an operation whose outcome was anything but success — and that has to
 * be structural, because the code is produced at the very end by whatever
 * happens to be holding an integer.
 *
 * **Two streams are one channel if anybody mixes them.** The answer is
 * machine-readable and goes one way; diagnostics are for a human and go the
 * other. A single diagnostic written to the answer stream corrupts every
 * downstream parse, and the failure is silent, intermittent, and appears only
 * when something goes wrong — which is when the pipeline mattered.
 *
 * This home owns neither argv parsing nor terminal capability. `01_hosts/server`
 * owns the process; a wire owns the translation.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  CaseOf,
  Equal,
  IsExactlyTrue,
  NonEmptyTuple,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { OperationId, OperationOutcome } from '../../00_core/07_operation/types.js';
import type { WireExchange } from '../types.js';

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

/**
 * Which of the two streams a byte belongs on.
 *
 * Named by role rather than by file descriptor. `stdout` and `stderr` are a
 * platform's spelling; *the answer* and *what a human needs to know* are the
 * distinction, and a wire that reasons about descriptors ends up arguing about
 * whether a progress bar is an error.
 */
export type CliStream = 'answer' | 'diagnostic';

/**
 * What one crossing writes, and where.
 *
 * `diagnostics` is a possibly-empty population on the diagnostic stream and
 * says nothing about success — a successful run may warn. What it may never do
 * is share a stream with the answer, which is what the law below pins.
 */
export interface CliOutput<Output = unknown> {
  readonly answer: { readonly stream: 'answer'; readonly value: Output };
  readonly diagnostics: {
    readonly stream: 'diagnostic';
    readonly entries: readonly Diagnostic[];
  };
}

// ---------------------------------------------------------------------------
// Exit
// ---------------------------------------------------------------------------

/**
 * What the process tells its parent.
 *
 * Four arms rather than an integer, because an integer is where the two
 * questions get merged. Each arm corresponds to a distinguishable thing that
 * happened, and only one of them is success:
 *
 * - `success` — the crossing completed and the operation succeeded.
 * - `refusedByOperation` — the crossing completed and the operation said no.
 *   The tool worked. The answer is no. A shell must not treat this as a crash
 *   and a human must not be shown a stack trace.
 * - `usage` — the crossing never became an invocation. Bad arguments, unknown
 *   command. Nothing ran.
 * - `interrupted` — the operation ran and its answer never made it out. The
 *   process died between the side effect and the flush, and this is the arm a
 *   wrapper script must not retry blindly.
 */
export type CliExit = Algebra<{
  success: Record<never, never>;
  refusedByOperation: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  usage: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  interrupted: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * One crossing as a command invocation.
 *
 * The exit arm is pinned per crossing arm wherever only one is honest, and the
 * completed arm is where the real work happens: it carries the receipt, so the
 * exit is a function of the *outcome* rather than of the transport.
 *
 * `answered` is deliberately not pinned to `success`. An operation that refused
 * arrived perfectly well, and forcing `success` here would make the command
 * report approval for a decision that was a refusal — the CLI form of a `200`
 * hiding a rejection.
 */
export type CliDisposition<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> = Algebra<{
  answered: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'completed'>;
    readonly output: CliOutput<Output>;
    readonly exit: Exclude<CliExit, CaseOf<CliExit, 'usage'> | CaseOf<CliExit, 'interrupted'>>;
  };
  rejected: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'refused'>;
    readonly exit: CaseOf<CliExit, 'usage'>;
  };
  interrupted: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'undelivered'>;
    readonly exit: CaseOf<CliExit, 'interrupted'>;
  };
}>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type CliLawA = OperationId<'liteship.wire.cli.law.op-a'>;
type CliLawB = OperationId<'liteship.wire.cli.law.op-b'>;

/**
 * Compile-time law: success is unreachable from a crossing that never ran, and
 * from one whose answer was lost.
 *
 * Lines one and two are the refusals, stated as the arm each crossing is pinned
 * to. A command that exits `0` after failing to parse its arguments is a
 * pipeline that continues on garbage, and a command that exits `0` after its
 * answer was lost is worse, because the operation ran.
 *
 * Line three is the freedom that must survive: a completed crossing may exit
 * `refusedByOperation`, because the tool worked and the answer is no. Line four
 * pins that the answered arm cannot borrow the two arms that belong to the other
 * crossings — a command whose operation refused must not report `usage`, which
 * would tell a human they typed something wrong.
 */
export type SuccessIsUnreachableWithoutACompletedOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<CliDisposition, 'rejected'>['exit'], CaseOf<CliExit, 'usage'>>,
        Equal<CaseOf<CliDisposition, 'interrupted'>['exit'], CaseOf<CliExit, 'interrupted'>>,
        CaseOf<CliExit, 'refusedByOperation'> extends CaseOf<CliDisposition, 'answered'>['exit']
          ? true
          : false,
        CaseOf<CliExit, 'usage'> extends CaseOf<CliDisposition, 'answered'>['exit'] ? true : false,
        CaseOf<CliExit, 'success'> extends CaseOf<CliDisposition, 'rejected'>['exit']
          ? true
          : false,
        CaseOf<CliExit, 'success'> extends CaseOf<CliDisposition, 'interrupted'>['exit']
          ? true
          : false,
      ],
      [true, true, true, false, false, false]
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
 * The four exit arms stay four. Collapsing `refusedByOperation` into `usage` is
 * the ordinary shape — one nonzero code for everything that is not success — and
 * it tells a user who typed a correct command that they typed it wrong.
 *
 * The outcome algebra is pinned alongside, because the exit arms exist to
 * project it: if `OperationOutcome` grows a fifth arm, this is where the
 * question of what the command should exit with becomes visible.
 */
export type ARefusalByTheOperationIsNotAUsageError = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<CliExit>, 'success' | 'refusedByOperation' | 'usage' | 'interrupted'>,
        Equal<TagOf<OperationOutcome>, 'succeeded' | 'failed' | 'refused' | 'cancelled'>,
        CaseOf<CliExit, 'success'> extends CaseOf<CliExit, 'refusedByOperation'> ? true : false,
        Equal<CaseOf<CliExit, 'refusedByOperation'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      ],
      [true, true, false, true]
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

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the wire topology. */
export interface CliWireTypeSurface {
  readonly stream: CliStream;
  readonly output: CliOutput;
  readonly exit: CliExit;
  readonly disposition: CliDisposition;
}
