/**
 * Compile-time laws for `01_hosts/worker/02_message`.
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
import type { CanonicalValue } from '../../../00_core/01_encoding/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Result, Signature } from '../../../types.js';
import type { ChannelId, ChannelOpenRequest, ChannelReference, CorrelationId, DeliveryReceipt, MessageBufferBound, MessageEnvelope, MessagingAuthority, WorkerChannel } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// Actual ordering guarantees, acknowledgement behavior, and replay under
// reconnection are runtime facts proved in the implementation phase; the
// declared relationships below are the type-level slice. Law-local aliases
// keep the fixtures readable.
// ---------------------------------------------------------------------------

type LawChannelA = ChannelId<'liteship.worker.law.channel-a'>;

type LawChannelB = ChannelId<'liteship.worker.law.channel-b'>;

type LawCorrelationA = CorrelationId<'liteship.worker.law.correlation-a'>;

type LawCorrelationB = CorrelationId<'liteship.worker.law.correlation-b'>;


/** Compile-time law: opening is decoder- and identity-correlated. */
export type OpeningIsDecoderAndIdentityCorrelated = Assert<
  Equal<
    [
      MessagingAuthority['open'] extends (
        request: ChannelOpenRequest<string, LawChannelA>,
      ) => Result<WorkerChannel<string, LawChannelA>, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      WorkerChannel<string, LawChannelA> extends WorkerChannel<Uint8Array, LawChannelA> ? true : false,
      WorkerChannel<string, LawChannelB> extends WorkerChannel<string, LawChannelA> ? true : false,
    ],
    [true, false, false]
  >
>;


/**
 * Compile-time law: a channel speaks exactly its own identity — an envelope
 * naming channel B is not an envelope of channel A, and channel A's close
 * accepts only channel A.
 */
export type AChannelSpeaksExactlyItself = Assert<
  Equal<
    [
      MessageEnvelope<string, LawChannelB, LawCorrelationA> extends MessageEnvelope<
        string,
        LawChannelA,
        LawCorrelationA
      >
        ? true
        : false,
      WorkerChannel<string, LawChannelA>['closeChannel'],
    ],
    [
      false,
      Signature<ChannelReference<LawChannelA>, ChannelReference<LawChannelA>, NonEmptyTuple<Diagnostic>>,
    ]
  >
>;


/**
 * Compile-time law: an acknowledgement names the exact correlation it
 * answers — sending correlation A yields a receipt of exactly A, never B.
 */
export type AnAcknowledgementNamesItsExactCorrelation = Assert<
  Equal<
    [
      WorkerChannel<string, LawChannelA>['send'] extends (
        envelope: MessageEnvelope<string, LawChannelA, LawCorrelationA>,
      ) => Result<DeliveryReceipt<LawCorrelationA>, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      DeliveryReceipt<LawCorrelationB> extends DeliveryReceipt<LawCorrelationA> ? true : false,
    ],
    [true, false]
  >
>;


/** Compile-time law: a channel is a bounded owned resource — two channels are two values. */
export type ChannelsAreBoundedOwnedResources = Assert<
  Equal<
    [
      WorkerChannel<CanonicalValue, ChannelId>['buffer'],
      WorkerChannel<CanonicalValue, ChannelId>['lifecycle'],
    ],
    [MessageBufferBound, CaseOf<RealizationLifecycle, 'owned'>]
  >
>;
