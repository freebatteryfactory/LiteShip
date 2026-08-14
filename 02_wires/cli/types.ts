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
  CaseOf,
  NonEmptyTuple,
  Refine,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type {
  OperationId,
  OperationOutcome,
  OperationReceipt,
} from '../../00_core/07_operation/types.js';
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
export interface CliDiagnosticStream {
  readonly stream: 'diagnostic';
  readonly entries: readonly Diagnostic[];
}

export interface CliOutput<Output = unknown> {
  readonly answer: { readonly stream: 'answer'; readonly value: Output };
  readonly diagnostics: CliDiagnosticStream;
}

// ---------------------------------------------------------------------------
// Exit
// ---------------------------------------------------------------------------

/**
 * What the process tells its parent.
 *
 * Six arms rather than an integer, because an integer is where the two
 * questions get merged. Each arm corresponds to a distinguishable thing that
 * happened, and only one of them is success:
 *
 * - `success` — the crossing completed and the operation succeeded.
 * - `refusedByOperation` — the crossing completed and the operation said no.
 *   The tool worked. The answer is no. A shell must not treat this as a crash
 *   and a human must not be shown a stack trace.
 * - `failed` — the crossing completed and the operation errored. The tool ran
 *   and could not do the thing.
 * - `cancelled` — the crossing completed and the operation was cancelled. Not
 *   a failure of the operation and not a refusal by it.
 * - `usage` — the crossing never became an invocation. Bad arguments, unknown
 *   command. Nothing ran.
 * - `interrupted` — the operation ran and its answer never made it out. The
 *   process died between the side effect and the flush, and this is the arm a
 *   wrapper script must not retry blindly.
 *
 * `failed` and `cancelled` did not exist here, and their absence was not a
 * gap in coverage — it was a forced lie. An operation whose receipt said
 * `failed` had only `success` and `refusedByOperation` available to it, so
 * every failing command had to report either approval or a refusal it never
 * made.
 */
export type CliExit = Algebra<{
  success: Record<never, never>;
  refusedByOperation: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  cancelled: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  usage: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  interrupted: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * A completed crossing whose receipt carries one named operation outcome.
 *
 * This is the type that makes the exit a projection rather than a sibling
 * opinion. The completed arm of `WireExchange` carries an `OperationReceipt`,
 * whose `outcome` already distinguishes succeeded, failed, refused, and
 * cancelled. Pinning that outcome per disposition arm is what relates the two.
 */
type CompletedWith<
  Outcome extends TagOf<OperationOutcome>,
  Output,
  Failure,
  Op extends OperationId,
> = Refine<
  CaseOf<WireExchange<Output, Failure, Op>, 'completed'>,
  {
    readonly receipt: Refine<
      OperationReceipt<Output, Failure, Op>,
      { readonly outcome: CaseOf<OperationOutcome<Output, Failure>, Outcome> }
    >;
  }
>;

/**
 * One crossing as a command invocation.
 *
 * The exit is a function of the operation's outcome, and this is the shape that
 * makes that sentence true rather than aspirational. There used to be one
 * `answered` arm carrying any completed crossing beside an independently
 * chosen exit, and the module comment above it claimed the exit derived from
 * the outcome. Nothing derived it. A receipt saying `failed` sat happily beside
 * `exit: success`, and the law on the subject only checked that the *other two*
 * crossing arms could not reach success — cross-arm exclusion, while the arm
 * where the real work happens went unrelated.
 *
 * That is the defect this file opens by naming: one integer asked to carry two
 * questions. The transport question was answered and the operation question was
 * left free, which is worse than not splitting them at all, because the split
 * looks done.
 *
 * Four completed arms now, one per outcome, each pinning both sides. Only
 * `succeeded` carries an answer value — a failing command previously had to
 * produce an `Output` it did not have, so the answer stream is now structurally
 * absent where there is nothing to put on it, rather than present and
 * fabricated.
 */
export type CliDisposition<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> = Algebra<{
  succeeded: {
    readonly crossing: CompletedWith<'succeeded', Output, Failure, Op>;
    readonly output: CliOutput<Output>;
    readonly exit: CaseOf<CliExit, 'success'>;
  };
  refusedByOperation: {
    readonly crossing: CompletedWith<'refused', Output, Failure, Op>;
    readonly diagnostics: CliDiagnosticStream;
    readonly exit: CaseOf<CliExit, 'refusedByOperation'>;
  };
  failed: {
    readonly crossing: CompletedWith<'failed', Output, Failure, Op>;
    readonly diagnostics: CliDiagnosticStream;
    readonly exit: CaseOf<CliExit, 'failed'>;
  };
  cancelled: {
    readonly crossing: CompletedWith<'cancelled', Output, Failure, Op>;
    readonly diagnostics: CliDiagnosticStream;
    readonly exit: CaseOf<CliExit, 'cancelled'>;
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
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the wire topology. */
export interface CliWireTypeSurface {
  readonly stream: CliStream;
  readonly output: CliOutput;
  readonly exit: CliExit;
  readonly disposition: CliDisposition;
}
