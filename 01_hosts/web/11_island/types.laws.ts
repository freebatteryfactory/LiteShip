/**
 * Compile-time laws for `01_hosts/web/11_island`.
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

import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionReference } from '../../../00_core/02_identity/types.js';
import type { StreamResumeRequest } from '../../../00_core/13_stream/types.js';
import type { RealizationInstanceReference, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, InputOf, OutputOf } from '../../../types.js';
import type { RegionAuthorityRequirement, RegionMembership } from '../01_region/types.js';
import type { ListenerReference } from '../03_event/types.js';
import type { CommitApplicationRequirement } from '../04_projection/types.js';
import type { WebExecutionRequirement } from '../10_execution/types.js';
import type { IslandActivationAuthority, IslandActivationOffer, IslandAuthorityRequirement, IslandInstance, IslandJoin, IslandResumeWindow, IslandState } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That sibling islands observe one committed generation, that no pre-activation
// update is lost, and that no partial transaction is ever exposed are
// assurance and implementation obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: an inactive island identifies its join and is not a failure. */
export type AnInactiveIslandIsNotAFailure = Assert<
  Equal<
    [
      CaseOf<IslandState, 'inactive'>['join'],
      'diagnostics' extends keyof CaseOf<IslandState, 'inactive'> ? true : false,
    ],
    [IslandJoin, false]
  >
>;


/** Compile-time law: the active arm carries the typed live instance, never a blur. */
export type TheActiveArmCarriesTheTypedInstance = Assert<
  Equal<CaseOf<IslandState, 'active'>['instance'], IslandInstance>
>;


/**
 * Compile-time law: the join binds program, revision, and one stream owner.
 * The stream identity lives once inside the resume request; neither the join
 * nor the window carries a sibling stream field to contradict it.
 */
export type TheJoinHasOneStreamOwner = Assert<
  Equal<
    [
      IslandJoin['program'],
      IslandJoin['revision'],
      IslandResumeWindow['resume'],
      'stream' extends keyof IslandJoin ? true : false,
      'stream' extends keyof IslandResumeWindow ? true : false,
    ],
    [
      ContentAddress<'application/vnd.liteship.program+cbor'>,
      RevisionReference,
      StreamResumeRequest,
      false,
      false,
    ]
  >
>;


/** Compile-time law: a long-lived island holds the owner membership type, never a frozen lease. */
export type AnIslandHoldsMembershipNotAFrozenAuthority = Assert<
  Equal<
    ['authority' extends keyof IslandInstance ? true : false, IslandInstance['join']['membership']],
    [false, RegionMembership]
  >
>;


/** Compile-time law: an island owns its whole lifetime, disposed exactly once. */
export type AnIslandOwnsItsLifetime = Assert<
  Equal<IslandInstance['lifecycle'], CaseOf<RealizationLifecycle, 'owned'>>
>;


/** Compile-time law: a live island records the selected resources that constitute it. */
export type AnIslandRecordsItsSelectedResources = Assert<
  Equal<
    [IslandInstance['execution'], IslandInstance['projection'], IslandInstance['subscriptions']],
    [RealizationInstanceReference, RealizationInstanceReference, readonly ListenerReference[]]
  >
>;


/** Compile-time law: activation is a real offer composing the homes beneath it. */
export type ActivationIsAnOfferComposingTheHost = Assert<
  Equal<
    [IslandActivationOffer['provides'], IslandActivationOffer['requires'], IslandActivationOffer['id']],
    [
      readonly [IslandAuthorityRequirement],
      readonly [RegionAuthorityRequirement, CommitApplicationRequirement, WebExecutionRequirement],
      RealizationOfferId<'liteship.web.offer.island-activation'>,
    ]
  >
>;


/**
 * Compile-time law: activation is repeatable — the provider consumes one
 * exact join per activation, and two live islands coexist as values.
 */
export type ActivationIsRepeatable = Assert<
  Equal<
    [
      InputOf<IslandActivationAuthority['activate']>,
      OutputOf<IslandActivationAuthority['activate']>,
      readonly [IslandInstance, IslandInstance] extends readonly IslandInstance[] ? true : false,
    ],
    [IslandJoin, IslandInstance, true]
  >
>;
