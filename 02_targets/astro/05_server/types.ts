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

import type {
  Algebra,
  Brand,
  NonEmptyTuple,
} from '../../../types.js';
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

/** The families this home owns, so none is correct and unreached. */
export interface AstroServerTypeSurface {
  readonly location: MountLocation;
  readonly mount: AstroMount<OperationId>;
  readonly outcome: AstroMountOutcome<OperationId>;
}
