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
  MigrationAdapter,
  MigrationFailure,
  MigrationReport,
  MigrationRequestId,
} from '../../00_core/14_compiler/types.js';
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

/** Output produced by cli. */
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
 * Seven arms rather than an integer, because an integer is where the two
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
 * - `threshold` — the operation succeeded and returned its answer, but a
 *   caller-selected wire policy rejects that answer for this invocation. The
 *   doctor program's strict mode is the first consumer: a caution report stays
 *   a caution report while the shell receives a nonzero exit.
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
  threshold: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
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
 * The exit is a function of the operation's outcome, and this shape makes that
 * relationship structural. One generic `answered` arm beside an independently
 * chosen exit would allow a failed receipt to sit beside `exit: success`.
 *
 * That is the defect this file opens by naming: one integer asked to carry two
 * questions. The transport question was answered and the operation question was
 * left free, which is worse than not splitting them at all, because the split
 * looks done.
 *
 * Five completed arms now: one per outcome plus the successful-answer
 * threshold projection. Each pins both sides. `succeeded` and `threshold`
 * carry an answer value; failing commands do not have an `Output` to fabricate.
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
  threshold: {
    readonly crossing: CompletedWith<'succeeded', Output, Failure, Op>;
    readonly output: CliOutput<Output>;
    readonly diagnostics: CliDiagnosticStream;
    readonly exit: CaseOf<CliExit, 'threshold'>;
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

/** CLI rendering of the exact migration operation contract. */
export type CliMigrationDisposition<
  Op extends OperationId,
  Adapter extends MigrationAdapter = MigrationAdapter,
  Request extends MigrationRequestId = MigrationRequestId,
> = CliDisposition<
  MigrationReport<Adapter, Request>,
  MigrationFailure,
  Op
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
  readonly migration: CliMigrationDisposition<OperationId>;
}
