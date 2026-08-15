/**
 * Custody across the worker boundary: copy, move, and share.
 *
 * A transfer list is not an optimization hint — it changes lawful custody.
 * This home owns the three custody modes, transfer tickets, custody receipts,
 * and detachment evidence. Copied values leave both sides lawful; a
 * transferred resource ends or changes sender custody; a shared resource has
 * explicit shared custody with scoped roles. Read-only shared views are
 * deliberately absent until a real need proves them.
 *
 * TypeScript cannot express linear types, so sender-after-transfer misuse is
 * made unrepresentable where the type model can do so — a ticket's mode is an
 * exact arm, and consummating a transferred ticket yields a receipt naming
 * the receiving side — and explicitly detectable where aliases and runtime
 * detachment exceed the type system, which is a `system/assurance` seam.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
  TagOf,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { GroundingId, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { WorkerGroundingDefinition, WorkerRealizationOffer } from '../00_bootstrap/types.js';
import type { ChannelReference, EndpointRole, MessagingRequirement } from '../02_message/types.js';

export type TransferableId<Name extends string = string> = Brand<
  Name,
  'liteship.worker.transferable-id'
>;
export type TransferableReference<Id extends TransferableId = TransferableId> = Reference<
  'worker-transferable',
  Id
>;

/**
 * The three custody modes. Copied: both sides hold lawful values. Moved:
 * sender custody ends. Shared: both sides hold the resource under explicit
 * scoped roles.
 */
export type CustodyMode = Algebra<{
  copied: Record<never, never>;
  moved: Record<never, never>;
  shared: { readonly role: EndpointRole };
}>;

/**
 * One declared custody transition: the exact resource, the exact mode, and
 * the channel it crosses. The mode parameter has no default — a ticket that
 * does not declare its custody transition is not a lawful type, and a moved
 * ticket is not a copied ticket.
 */
export interface TransferTicket<Mode extends TagOf<CustodyMode>> {
  readonly resource: TransferableReference;
  readonly mode: CaseOf<CustodyMode, Mode>;
  readonly channel: ChannelReference;
}

/**
 * Proof of the consummated transition: which ticket, who holds custody now,
 * and the physical receipt address.
 */
export interface CustodyReceipt<Mode extends TagOf<CustodyMode>> {
  readonly ticket: TransferTicket<Mode>;
  readonly holder: EndpointRole;
  readonly address: ContentAddress<'application/vnd.liteship.worker-custody+cbor'>;
}

/** Evidence that a sender-side value became detached after a move. */
export interface DetachmentEvidence {
  readonly resource: TransferableReference;
  readonly receipt: ContentAddress<'application/vnd.liteship.worker-custody+cbor'>;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Narrow intrinsic authority over the structured-clone and transfer machinery. */
export interface TransferFacility {
  readonly endpoint: EndpointRole;
}

/**
 * The transfer provider. Declaration and consummation are mode-correlated:
 * consummating a moved ticket yields a moved receipt, never a copied one, and
 * a moved consummation also yields the sender-side detachment evidence.
 */
export interface TransferAuthority {
  readonly declare: <Mode extends TagOf<CustodyMode>>(
    ticket: TransferTicket<Mode>,
  ) => Result<TransferTicket<Mode>, NonEmptyTuple<Diagnostic>>;
  readonly consummate: <Mode extends TagOf<CustodyMode>>(
    ticket: TransferTicket<Mode>,
  ) => Result<CustodyReceipt<Mode>, NonEmptyTuple<Diagnostic>>;
  readonly detachment: Signature<TransferTicket<'moved'>, DetachmentEvidence, NonEmptyTuple<Diagnostic>>;
}

export type TransferFacilityRequirement = Hole<'liteship.worker.transfer-facility', TransferFacility>;
export type TransferRequirement = Hole<'liteship.worker.transfer', TransferAuthority>;

/** Intrinsic grounding: the platform transfer machinery, admitted narrowly. */
export interface TransferFacilityGrounding
  extends WorkerGroundingDefinition<
    readonly [TransferFacilityRequirement],
    TransferFacility,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.worker.grounding.transfer-facility'>;
}

/** Constructing the transfer provider: it rides declared channels, so messaging is required. */
export interface TransferAuthorityOffer
  extends WorkerRealizationOffer<
    readonly [TransferRequirement],
    readonly [TransferFacilityRequirement, MessagingRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.worker.offer.transfer-authority'>;
  readonly locations: NonEmptyTuple<'local'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the worker topology. */
export interface WorkerTransferTypeSurface {
  readonly mode: CustodyMode;
  readonly ticket: TransferTicket<TagOf<CustodyMode>>;
  readonly receipt: CustodyReceipt<TagOf<CustodyMode>>;
  readonly authority: TransferAuthority;
  readonly facility: TransferFacilityGrounding;
  readonly transferOffer: TransferAuthorityOffer;
}
