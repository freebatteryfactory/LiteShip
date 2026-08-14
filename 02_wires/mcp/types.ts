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
  Assert,
  CaseOf,
  Equal,
  IsExactlyTrue,
  NonEmptyTuple,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { OperationId, OperationReference } from '../../00_core/07_operation/types.js';
import type { WireExchange, WireExposure } from '../types.js';

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

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type McpLawA = OperationId<'liteship.wire.mcp.law.op-a'>;
type McpLawB = OperationId<'liteship.wire.mcp.law.op-b'>;

/**
 * Compile-time law: a completed crossing is a result, never a protocol error.
 *
 * This is the central claim of the home, and it is stated as
 * non-substitutability between the arms rather than as a rule somebody follows.
 * The `protocolError` arm can only be built from a crossing that was `refused`
 * at the boundary, so a tool that ran and declined has nowhere to put itself
 * except `result`.
 *
 * Line three is the one an implementation would otherwise get wrong every time:
 * a protocol error carries no receipt, because nothing ran to have one. Line
 * four is its partner — a result does carry one, so the model gets the outcome
 * rather than a bare failure flag.
 */
export type ACompletedCrossingIsAResultNotAProtocolError = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<McpAnswer, 'result'>['crossing'],
          CaseOf<WireExchange, 'completed'>
        >,
        Equal<
          CaseOf<McpAnswer, 'protocolError'>['crossing'],
          CaseOf<WireExchange, 'refused'>
        >,
        'receipt' extends keyof CaseOf<McpAnswer, 'protocolError'>['crossing'] ? true : false,
        'receipt' extends keyof CaseOf<McpAnswer, 'result'>['crossing'] ? true : false,
        CaseOf<WireExchange, 'completed'> extends CaseOf<
          McpAnswer,
          'protocolError'
        >['crossing']
          ? true
          : false,
      ],
      [true, true, false, true, false]
    >
  >
>;

/**
 * Compile-time law: a lost answer is its own arm.
 *
 * Three arms and no fewer. Collapsing `transportLoss` into `protocolError` is
 * the shape that makes a model retry a call whose effects already happened, and
 * collapsing it into `result` claims an answer that was never received.
 *
 * The negative lines check for the two names the merge would arrive under.
 */
export type ALostAnswerIsItsOwnArm = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<McpAnswer>, 'protocolError' | 'result' | 'transportLoss'>,
        'error' extends TagOf<McpAnswer> ? true : false,
        'failed' extends TagOf<McpAnswer> ? true : false,
        Equal<CaseOf<McpAnswer, 'transportLoss'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      ],
      [true, false, false, true]
    >
  >
>;

/**
 * Compile-time law: an offer names its kind, and the catalog is exact about it.
 *
 * Line one is the axis the umbrella's flat exposure cannot carry. Lines two and
 * three are the exactness that makes it worth having: the same operation offered
 * as a tool and as a resource are different offers, and if they were mutually
 * assignable the kind would be documentation.
 *
 * Line four keeps the umbrella's shape visible — this catalog refines
 * `WireExposure` and does not fork it, so `withheld` stays a bare population
 * because a withheld operation is not being offered as anything.
 */
export type AnOfferNamesItsKind = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<McpOffer['kind'], McpSurfaceKind>,
        McpOffer<McpLawA, 'tool'> extends McpOffer<McpLawA, 'resource'> ? true : false,
        McpOffer<McpLawA, 'tool'> extends McpOffer<McpLawB, 'tool'> ? true : false,
        Equal<McpCatalog['withheld'], WireExposure['withheld']>,
        Equal<McpCatalog['offered'], NonEmptyTuple<McpOffer>>,
      ],
      [true, false, false, true, true]
    >
  >
>;

/**
 * Compile-time law: an answer is exact over the operation it answers for.
 *
 * The third line is the anti-vacuity partner for the carrier dropping its
 * parameter.
 */
export type AnMcpAnswerIsExactOverItsOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        McpAnswer<unknown, readonly Diagnostic[], McpLawA> extends McpAnswer<
          unknown,
          readonly Diagnostic[],
          McpLawB
        >
          ? true
          : false,
        McpAnswer<unknown, readonly Diagnostic[], McpLawA> extends McpAnswer<
          unknown,
          readonly Diagnostic[],
          McpLawA
        >
          ? true
          : false,
        McpAnswer extends McpAnswer<unknown, readonly Diagnostic[], McpLawA> ? true : false,
      ],
      [false, true, false]
    >
  >
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the wire topology. */
export interface McpWireTypeSurface {
  readonly kind: McpSurfaceKind;
  readonly offer: McpOffer;
  readonly catalog: McpCatalog;
  readonly answer: McpAnswer;
}
