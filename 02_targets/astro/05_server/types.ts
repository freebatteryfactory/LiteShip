/**
 * Application-directed mount mechanics: connecting Astro's server lifecycle to
 * authorities that already exist.
 *
 * The application owns the route. This home owns the attachment — the act of
 * binding a location the application chose to one exact core operation, over an
 * admitted host request, with a correlated response-commit grant. `injectRoute`
 * stays at zero, which the predecessor already got right and stated in its own
 * architecture document.
 *
 * What the predecessor got wrong is everything underneath. Its unregistered
 * route factories owned HTTP themselves: 415, 400, 409, 422, 405, 413, 304,
 * weak ETags, and two independent hand-rolled JSON-RPC implementations that
 * shared nothing — while a transport-free operation vocabulary already existed
 * and was wired to the CLI and MCP but never to Astro. This home makes that
 * connection and owns none of the HTTP.
 *
 * Status policy, content negotiation, entity tags, request decoding, and
 * protocol framing belong to the host and, later, to `02_wires/`. The absence
 * laws below are what keep them from growing back here.
 *
 * @module
 */

import type { Algebra, Assert, Brand, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  OperationId,
  OperationInvocation,
  OperationReceipt,
} from '../../../00_core/07_operation/types.js';
import type {
  AdmittedRequest,
  EdgeRequestId,
} from '../../../01_hosts/edge/01_request/types.js';
import type { ResponseCommitGrant } from '../../../01_hosts/edge/09_response/types.js';

/**
 * Where the application chose to mount an attachment.
 *
 * Opaque on purpose. This child does not parse, pattern-match, or rank
 * locations — that is routing, and routing belongs to the application.
 */
export type MountLocation = Brand<string, 'liteship.target.astro.mount-location'>;

/**
 * One attachment: an application-chosen location bound to one exact operation.
 *
 * The operation identity is a type parameter with no broad default on the
 * governed path, so an attachment for operation A is not an attachment for
 * operation B.
 */
export interface AstroMount<Op extends OperationId, Input = unknown> {
  readonly location: MountLocation;
  readonly invocation: OperationInvocation<Input, Op>;
  readonly request: AdmittedRequest<EdgeRequestId>;
  readonly commit: ResponseCommitGrant;
}

/** What an attachment produced. */
export type AstroMountOutcome<
  Op extends OperationId,
  Output = unknown,
  Failure = readonly Diagnostic[],
> = Algebra<{
  received: { readonly receipt: OperationReceipt<Output, Failure, Op> };
  unmountable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

// ---------------------------------------------------------------------------
// Laws

type LawOpA = OperationId<'liteship.graph.query'>;
type LawOpB = OperationId<'liteship.graph.mutate'>;

/**
 * Compile-time law: an attachment names one exact operation, and two
 * operations are not interchangeable.
 */
export type AMountNamesOneExactOperation = Assert<
  Equal<
    [
      Equal<AstroMount<LawOpA>['invocation'], OperationInvocation<unknown, LawOpA>>,
      AstroMount<LawOpA> extends AstroMount<LawOpB> ? true : false,
    ],
    [true, false]
  >
>;

/**
 * Compile-time law: the attachment carries the host's admitted request and the
 * host's commit grant, not restatements of either.
 *
 * Written against the imported authorities. A local twin of `AdmittedRequest`
 * would be structurally identical to the compiler and would fail this law,
 * which is the only way provenance can be checked in a type.
 */
export type AMountCarriesHostAuthorities = Assert<
  Equal<
    [
      Equal<AstroMount<LawOpA>['request'], AdmittedRequest<EdgeRequestId>>,
      Equal<AstroMount<LawOpA>['commit'], ResponseCommitGrant>,
    ],
    [true, true]
  >
>;

/**
 * Compile-time law: the attachment owns no HTTP.
 *
 * Every key here names something the predecessor's route factories owned.
 * Their absence is the law; their presence would mean a second dispatcher has
 * grown inside a target child.
 */
export type AMountOwnsNoTransportPolicy = Assert<
  Equal<
    [
      'status' extends keyof AstroMount<LawOpA> ? true : false,
      'headers' extends keyof AstroMount<LawOpA> ? true : false,
      'etag' extends keyof AstroMount<LawOpA> ? true : false,
      'vary' extends keyof AstroMount<LawOpA> ? true : false,
      'negotiate' extends keyof AstroMount<LawOpA> ? true : false,
      'decode' extends keyof AstroMount<LawOpA> ? true : false,
      'body' extends keyof AstroMount<LawOpA> ? true : false,
      'jsonrpc' extends keyof AstroMount<LawOpA> ? true : false,
      'dispatch' extends keyof AstroMount<LawOpA> ? true : false,
      'route' extends keyof AstroMount<LawOpA> ? true : false,
    ],
    [false, false, false, false, false, false, false, false, false, false]
  >
>;

/**
 * Compile-time law: the outcome is a core receipt, not a response.
 *
 * A target that produced a response would have chosen a status and a
 * representation, which is exactly the authority it must not hold.
 */
export type AMountProducesAReceiptNotAResponse = Assert<
  Equal<
    [
      Equal<CaseOf<AstroMountOutcome<LawOpA>, 'received'>['receipt'], OperationReceipt<unknown, readonly Diagnostic[], LawOpA>>,
      'response' extends keyof CaseOf<AstroMountOutcome<LawOpA>, 'received'> ? true : false,
      'status' extends keyof CaseOf<AstroMountOutcome<LawOpA>, 'received'> ? true : false,
    ],
    [true, false, false]
  >
>;

/** Compile-time law: an unmountable attachment says why and carries no receipt. */
export type AnUnmountableAttachmentExplainsItself = Assert<
  Equal<
    [
      Equal<CaseOf<AstroMountOutcome<LawOpA>, 'unmountable'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      'receipt' extends keyof CaseOf<AstroMountOutcome<LawOpA>, 'unmountable'> ? true : false,
    ],
    [true, false]
  >
>;

/** The families this home owns, so none is correct and unreached. */
export interface AstroServerTypeSurface {
  readonly location: MountLocation;
  readonly mount: AstroMount<OperationId>;
  readonly outcome: AstroMountOutcome<OperationId>;
}
