/**
 * Compile-time laws for `01_hosts/worker/03_transfer`.
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

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Result, Signature, TagOf } from '../../../types.js';
import type { EndpointRole, MessagingRequirement } from '../02_message/types.js';
import type { CustodyMode, CustodyReceipt, DetachmentEvidence, TransferAuthority, TransferAuthorityOffer, TransferFacilityRequirement, TransferTicket } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That sender custody actually changes after a move, and that runtime
// detachment or revocation is honored, are `system/assurance` obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: the custody arms are exactly copy, move, and share. */
export type TheCustodyArmsAreExact = Assert<
  Equal<TagOf<CustodyMode>, 'copied' | 'moved' | 'shared'>
>;


/** Compile-time law: a ticket of one mode is not a ticket of another. */
export type ATicketPinsItsMode = Assert<
  Equal<
    [
      TransferTicket<'moved'>['mode'],
      TransferTicket<'moved'> extends TransferTicket<'copied'> ? true : false,
    ],
    [CaseOf<CustodyMode, 'moved'>, false]
  >
>;


/** Compile-time law: consummation is mode-correlated — a moved ticket yields a moved receipt. */
export type ConsummationIsModeCorrelated = Assert<
  Equal<
    [
      TransferAuthority['consummate'] extends (
        ticket: TransferTicket<'moved'>,
      ) => Result<CustodyReceipt<'moved'>, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      CustodyReceipt<'moved'> extends CustodyReceipt<'copied'> ? true : false,
    ],
    [true, false]
  >
>;


/** Compile-time law: only a moved ticket produces detachment evidence. */
export type OnlyAMoveDetaches = Assert<
  Equal<
    TransferAuthority['detachment'],
    Signature<TransferTicket<'moved'>, DetachmentEvidence, NonEmptyTuple<Diagnostic>>
  >
>;


/** Compile-time law: transfer requires messaging — custody transitions ride declared channels. */
export type TransferRequiresMessaging = Assert<
  Equal<TransferAuthorityOffer['requires'], readonly [TransferFacilityRequirement, MessagingRequirement]>
>;


/** Compile-time law: a shared arm names its role; copy and move carry none. */
export type SharedCustodyNamesItsRole = Assert<
  Equal<
    [
      CaseOf<CustodyMode, 'shared'>['role'],
      'role' extends keyof CaseOf<CustodyMode, 'copied'> ? true : false,
    ],
    [EndpointRole, false]
  >
>;
