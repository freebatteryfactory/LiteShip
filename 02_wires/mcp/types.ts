/**
 * The MCP wire: operations exposed to a model.
 *
 * Two facts have no owner upstream, and both are places this protocol smears a
 * distinction the umbrella exists to keep.
 *
 * **An exposed operation surfaces as one of three kinds.** A tool is called, a
 * resource is read, a prompt is instantiated. The umbrella's `WireExposure` is a
 * flat population of operation references, which is right for every other wire
 * and insufficient here: the same operation exposed as a tool and as a resource
 * is a different offer to the caller, and a catalog that cannot say which is a
 * catalog nobody can audit.
 *
 * **A tool that ran and refused is not a protocol error.** This is the one that
 * matters. MCP has a transport-level error channel and a tool-result channel,
 * and servers habitually use the first for the second — a tool that validated
 * its input and declined returns a JSON-RPC error, which tells the model the
 * *call* was malformed. The model then rewrites a call that was correct.
 *
 * That is exactly the umbrella's cut. A crossing that never became an invocation
 * is a protocol error. A crossing that completed carrying a receipt whose
 * outcome is `refused` is a *result* — the tool worked, and the answer is no.
 * The wire's whole job here is to not merge them, and this home makes the merge
 * unrepresentable rather than discouraged.
 *
 * It owns no schema, no session, no capability negotiation, and no JSON-RPC
 * envelope. Those are the protocol's; `00_core/03_schema` already owns schema.
 *
 * @module
 */

import type {
  Algebra,
  CaseOf,
  NonEmptyTuple,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { ContentAddress } from '../../00_core/01_encoding/types.js';
import type {
  MigrationAdapter,
  MigrationFailure,
  MigrationReport,
  MigrationRequestId,
} from '../../00_core/14_compiler/types.js';
import type { OperationId, OperationReference } from '../../00_core/07_operation/types.js';
import type {
  WireExchange,
} from '../types.js';

// ---------------------------------------------------------------------------
// Exposure
// ---------------------------------------------------------------------------

/**
 * How one operation appears to a model.
 *
 * Three kinds, and they are not interchangeable presentations of one thing. A
 * tool is invoked with arguments and has effects. A resource is addressed and
 * read. A prompt is a template the caller instantiates. Which one an operation
 * surfaces as changes what a model is entitled to do with it.
 */
export type McpSurfaceKind = 'tool' | 'resource' | 'prompt';

/**
 * One entry in an MCP catalog: which operation, surfaced as what.
 *
 * Exact over both axes, so an entry offering operation A as a tool cannot stand
 * in for one offering operation B, or for the same operation offered as a
 * resource.
 */
export interface McpOffer<
  Op extends OperationId = OperationId,
  Kind extends McpSurfaceKind = McpSurfaceKind,
> {
  readonly operation: OperationReference<Op>;
  readonly kind: Kind;
}

/**
 * What this wire offers, and what it withholds.
 *
 * The offered population is non-empty for the umbrella's reason — a wire that
 * projects nothing cannot be observed failing — and `withheld` stays as the
 * umbrella declares it, a bare operation population. That asymmetry is
 * deliberate: a withheld operation has no kind, because it is not being offered
 * as anything.
 */
export interface McpCatalog {
  readonly offered: NonEmptyTuple<McpOffer>;
  readonly withheld: readonly OperationReference[];
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/**
 * What the model receives back, split by what actually happened.
 *
 * `protocolError` projects the crossing that never became an invocation. The
 * call was malformed or named nothing. Rewriting the call is the correct
 * response, and it is the only arm for which that is true.
 *
 * `result` projects a crossing that completed, and carries the whole receipt.
 * Its outcome may be `succeeded`, `failed`, `refused`, or `cancelled` — all four
 * are results. A tool that declined is here. A tool that threw is here. The call
 * was fine; the answer is what it is, and a model that receives this should
 * reason about the answer rather than rewrite the call.
 *
 * `transportLoss` projects the crossing whose operation ran and whose answer did
 * not arrive. It is neither of the above and must not be reported as either: a
 * model told this was a protocol error will retry a call that already had
 * effects.
 */
export type McpAnswer<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> = Algebra<{
  protocolError: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'refused'>;
  };
  result: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'completed'>;
  };
  transportLoss: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'undelivered'>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

/** Migration is an invokable MCP tool, never an orphan library. */
export interface McpMigrationProjection<
  Op extends OperationId,
  Adapter extends MigrationAdapter = MigrationAdapter,
  Request extends MigrationRequestId = MigrationRequestId,
> {
  readonly offer: McpOffer<Op, 'tool'>;
  readonly answer: McpAnswer<MigrationReport<Adapter, Request>, MigrationFailure, Op>;
}

/**
 * Evidence that one MCP composition is admitted for trusted local execution.
 *
 * This is a wire-composition fact, not authority conferred by the caller. The
 * address names the host admission and policy evidence that made a local
 * execution tool reachable. A general MCP catalog has no such member and does
 * not become trusted merely by offering the same operation.
 */
export type McpLocalTrustAdmission = ContentAddress<
  'application/vnd.liteship.mcp-local-trust-admission+cbor'
>;

/** One tool exposed only by an exact trusted-local MCP composition. */
export interface TrustedLocalMcpToolProjection<
  Output,
  Failure,
  Op extends OperationId,
> {
  readonly admission: McpLocalTrustAdmission;
  readonly offer: McpOffer<Op, 'tool'>;
  readonly answer: McpAnswer<Output, Failure, Op>;
}

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the wire topology. */
export interface McpWireTypeSurface {
  readonly kind: McpSurfaceKind;
  readonly offer: McpOffer;
  readonly catalog: McpCatalog;
  readonly answer: McpAnswer;
  readonly migration: McpMigrationProjection<OperationId>;
  readonly localTrust: McpLocalTrustAdmission;
  readonly trustedLocalTool: TrustedLocalMcpToolProjection<unknown, readonly Diagnostic[], OperationId>;
}
