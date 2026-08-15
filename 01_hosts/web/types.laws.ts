/**
 * Compile-time laws for `01_hosts/web`.
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

import type { GroundingId, RealizationOfferId } from '../../00_core/14_compiler/types.js';
import type { Assert, Equal, InputOf } from '../../types.js';
import type { RealizationCatalog } from '../types.js';
import type { WebBootstrapTypeSurface } from './00_bootstrap/types.js';
import type { ApplicationMountGrounding, InvocationMountGrounding, MountRegion, RegionAuthority, RegionAuthorityOffer, RegionDiscovery, RegionDiscoveryGrounding, WebRegionTypeSurface } from './01_region/types.js';
import type { SinkPolicyGrounding, WebSecurityTypeSurface, WebSinkPolicy } from './02_security/types.js';
import type { EventAuthorityOffer, EventFacility, EventFacilityGrounding, WebEventTypeSurface } from './03_event/types.js';
import type { CommitApplicationOffer, ComponentRendererCatalog, RendererCatalogGrounding, WebProjectionTypeSurface } from './04_projection/types.js';
import type { ProbeFacilityGrounding, WebEvidenceTypeSurface } from './05_evidence/types.js';
import type { TransportAuthority, TransportAuthorityOffer, TransportFacilityGrounding, WebTransportTypeSurface } from './06_transport/types.js';
import type { DatabaseFacilityGrounding, WebPersistenceTypeSurface, WebStoreOffer } from './07_persistence/types.js';
import type { AudioFacility, AudioFacilityGrounding, AudioRuntimeAuthority, AudioRuntimeOffer, CodecAdmissionGrounding, InjectedAudioRuntimeGrounding, MediaAuthorityOffer, SampleClockTransport, WebCodecAdmission, WebCodecOffer, WebMediaTypeSurface } from './08_media/types.js';
import type { GpuAccess, GpuAccessGrounding, GraphicsAuthorityOffer, GraphicsLoss, WebGraphicsTypeSurface } from './09_graphics/types.js';
import type { ExecutionHostOffer, PreparationOffer, SchedulingFacility, SchedulingFacilityGrounding, WebExecutionTypeSurface } from './10_execution/types.js';
import type { IslandActivationOffer, WebIslandTypeSurface } from './11_island/types.js';
import type { CaptureAuthorityOffer, CaptureFacilityGrounding, WebCaptureTypeSurface } from './12_capture/types.js';
import type { WebCapabilityTopology, WebTypeAt, WebTypeTopology } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That the roster, order, and surfaces agree with the physical directory tree,
// and that the erased catalog faithfully derives from these declarations, are
// `system/assurance` comparisons against the repository.
// ---------------------------------------------------------------------------

/** Compile-time law: the topology is ordered — position by position, exactly. */
export type TheTopologyIsOrderedExactly = Assert<
  Equal<
    [
      WebTypeTopology[0]['name'],
      WebTypeTopology[1]['name'],
      WebTypeTopology[2]['name'],
      WebTypeTopology[3]['name'],
      WebTypeTopology[4]['name'],
      WebTypeTopology[5]['name'],
      WebTypeTopology[6]['name'],
      WebTypeTopology[7]['name'],
      WebTypeTopology[8]['name'],
      WebTypeTopology[9]['name'],
      WebTypeTopology[10]['name'],
      WebTypeTopology[11]['name'],
      WebTypeTopology[12]['name'],
    ],
    [
      '00_bootstrap',
      '01_region',
      '02_security',
      '03_event',
      '04_projection',
      '05_evidence',
      '06_transport',
      '07_persistence',
      '08_media',
      '09_graphics',
      '10_execution',
      '11_island',
      '12_capture',
    ]
  >
>;


/** Compile-time law: every home resolves to its own surface — no swap can hide anywhere. */
export type EachHomeResolvesToItsOwnSurface = Assert<
  Equal<
    [
      WebTypeAt<'00_bootstrap'>,
      WebTypeAt<'01_region'>,
      WebTypeAt<'02_security'>,
      WebTypeAt<'03_event'>,
      WebTypeAt<'04_projection'>,
      WebTypeAt<'05_evidence'>,
      WebTypeAt<'06_transport'>,
      WebTypeAt<'07_persistence'>,
      WebTypeAt<'08_media'>,
      WebTypeAt<'09_graphics'>,
      WebTypeAt<'10_execution'>,
      WebTypeAt<'11_island'>,
      WebTypeAt<'12_capture'>,
    ],
    [
      WebBootstrapTypeSurface,
      WebRegionTypeSurface,
      WebSecurityTypeSurface,
      WebEventTypeSurface,
      WebProjectionTypeSurface,
      WebEvidenceTypeSurface,
      WebTransportTypeSurface,
      WebPersistenceTypeSurface,
      WebMediaTypeSurface,
      WebGraphicsTypeSurface,
      WebExecutionTypeSurface,
      WebIslandTypeSurface,
      WebCaptureTypeSurface,
    ]
  >
>;


/**
 * Compile-time law: the grounding population is exact — a slot cannot silently
 * vanish.
 *
 * What it catches, verified: deleting a slot from the topology turns this red,
 * and the compiler does not otherwise notice, because the deleted type stays
 * imported by the identity law below.
 *
 * What it cannot catch, also verified: a capability that was never added. This
 * law reads `keyof` off the topology and compares it against a list written
 * beside it, so its source is the thing under test — it certifies whatever the
 * topology happens to contain. `WebCodecOffer` and `CodecAdmissionGrounding`
 * were declared in `08_media`, claimed in that home's README, covered by four
 * laws asserting they fill core's codec sockets, and absent from this topology,
 * while this law reported the population exact. The server child wired its
 * equivalent; web did not; nothing could tell.
 *
 * Declared-versus-wired is therefore not a type fact. It is a comparison
 * between what a home exports and what its parent composes, and it belongs to
 * `system/01_assurance/00_audit`.
 */
export type TheGroundingPopulationIsExact = Assert<
  Equal<
    keyof WebCapabilityTopology['groundings'],
    | 'regionDiscovery'
    | 'applicationMount'
    | 'invocationMount'
    | 'sinkPolicy'
    | 'rendererCatalog'
    | 'eventFacility'
    | 'probeFacility'
    | 'transportFacility'
    | 'databaseFacility'
    | 'audioFacility'
    | 'injectedAudioRuntime'
    | 'gpuAccess'
    | 'captureFacility'
    | 'codecAdmission'
    | 'schedulingFacility'
  >
>;

/** Compile-time law: every web grounding admits the exact supplied browser, application, or invocation fact. */
export type EveryWebGroundingAdmitsItsExactSuppliedInput = Assert<
  Equal<
    [
      InputOf<WebCapabilityTopology['groundings']['regionDiscovery']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['applicationMount']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['invocationMount']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['sinkPolicy']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['rendererCatalog']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['eventFacility']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['probeFacility']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['transportFacility']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['databaseFacility']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['audioFacility']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['injectedAudioRuntime']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['gpuAccess']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['captureFacility']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['codecAdmission']['admit']>,
      InputOf<WebCapabilityTopology['groundings']['schedulingFacility']['admit']>,
    ],
    [
      RegionDiscovery,
      MountRegion,
      MountRegion,
      WebSinkPolicy,
      ComponentRendererCatalog,
      EventFacility,
      import('./05_evidence/types.js').ProbeFacility,
      import('./06_transport/types.js').BrowserTransportFacility,
      import('./07_persistence/types.js').DatabaseFacility,
      AudioFacility,
      AudioRuntimeAuthority,
      GpuAccess,
      import('./12_capture/types.js').CaptureFacility,
      WebCodecAdmission,
      SchedulingFacility,
    ]
  >
>;


/** Compile-time law: the offer population is exact — an offer cannot silently vanish. */
export type TheOfferPopulationIsExact = Assert<
  Equal<
    keyof WebCapabilityTopology['offers'],
    | 'regionAuthority'
    | 'eventAuthority'
    | 'commitApplication'
    | 'transportAuthority'
    | 'store'
    | 'audioRuntime'
    | 'mediaAuthority'
    | 'graphicsAuthority'
    | 'executionHost'
    | 'preparation'
    | 'islandActivation'
    | 'captureAuthority'
    | 'codec'
  >
>;


/**
 * Compile-time law: every declaration pins its exact distinct identity — an
 * offer or slot cannot borrow another's name or fall back to the broad brand.
 */
export type EveryDeclarationPinsItsExactIdentity = Assert<
  Equal<
    [
      RegionAuthorityOffer['id'],
      EventAuthorityOffer['id'],
      CommitApplicationOffer['id'],
      TransportAuthorityOffer['id'],
      WebStoreOffer['id'],
      AudioRuntimeOffer['id'],
      MediaAuthorityOffer['id'],
      GraphicsAuthorityOffer['id'],
      ExecutionHostOffer['id'],
      PreparationOffer['id'],
      IslandActivationOffer['id'],
      CaptureAuthorityOffer['id'],
      WebCodecOffer['id'],
      RegionDiscoveryGrounding['id'],
      ApplicationMountGrounding['id'],
      InvocationMountGrounding['id'],
      SinkPolicyGrounding['id'],
      RendererCatalogGrounding['id'],
      EventFacilityGrounding['id'],
      ProbeFacilityGrounding['id'],
      TransportFacilityGrounding['id'],
      DatabaseFacilityGrounding['id'],
      AudioFacilityGrounding['id'],
      InjectedAudioRuntimeGrounding['id'],
      GpuAccessGrounding['id'],
      SchedulingFacilityGrounding['id'],
      CaptureFacilityGrounding['id'],
      CodecAdmissionGrounding['id'],
    ],
    [
      RealizationOfferId<'liteship.web.offer.region-authority'>,
      RealizationOfferId<'liteship.web.offer.event-authority'>,
      RealizationOfferId<'liteship.web.offer.commit-application'>,
      RealizationOfferId<'liteship.web.offer.transport-authority'>,
      RealizationOfferId<'liteship.web.offer.store'>,
      RealizationOfferId<'liteship.web.offer.audio-runtime'>,
      RealizationOfferId<'liteship.web.offer.media-authority'>,
      RealizationOfferId<'liteship.web.offer.graphics-authority'>,
      RealizationOfferId<'liteship.web.offer.execution-host'>,
      RealizationOfferId<'liteship.web.offer.preparation'>,
      RealizationOfferId<'liteship.web.offer.island-activation'>,
      RealizationOfferId<'liteship.web.offer.capture-authority'>,
      RealizationOfferId<'liteship.web.offer.codec-facility'>,
      GroundingId<'liteship.web.grounding.region-discovery'>,
      GroundingId<'liteship.web.grounding.application-mount'>,
      GroundingId<'liteship.web.grounding.invocation-mount'>,
      GroundingId<'liteship.web.grounding.sink-policy'>,
      GroundingId<'liteship.web.grounding.renderer-catalog'>,
      GroundingId<'liteship.web.grounding.event-facility'>,
      GroundingId<'liteship.web.grounding.probe-facility'>,
      GroundingId<'liteship.web.grounding.transport-facility'>,
      GroundingId<'liteship.web.grounding.database-facility'>,
      GroundingId<'liteship.web.grounding.audio-facility'>,
      GroundingId<'liteship.web.grounding.injected-audio-runtime'>,
      GroundingId<'liteship.web.grounding.gpu-access'>,
      GroundingId<'liteship.web.grounding.scheduling-facility'>,
      GroundingId<'liteship.web.grounding.capture-facility'>,
      GroundingId<'liteship.web.grounding.codec-admission'>,
    ]
  >
>;


/**
 * Compile-time law: the capability topology also carries its own erased
 * catalog — the descriptor population assurance proves faithful to these
 * typed declarations.
 */
export type TheTopologyCarriesItsErasedCatalog = Assert<
  Equal<WebCapabilityTopology['erased'], RealizationCatalog>
>;


/** Compile-time law: activation composes real declared authorities, reachable in the topology. */
export type TheCapabilityTopologyReachesActivation = Assert<
  Equal<WebCapabilityTopology['offers']['islandActivation'], IslandActivationOffer>
>;


/**
 * Compile-time law: load-bearing surface members stay their declared types —
 * a surface cannot quietly blur its clock, loss relation, transport authority,
 * or ownership authority to `unknown` while the whole-surface comparison
 * stays trivially green.
 */
export type SurfacesCarryTheirDeclaredMembers = Assert<
  Equal<
    [
      WebTypeAt<'08_media'>['clock'],
      WebTypeAt<'09_graphics'>['loss'],
      WebTypeAt<'06_transport'>['authority'],
      WebTypeAt<'01_region'>['manager'],
    ],
    [SampleClockTransport, GraphicsLoss, TransportAuthority, RegionAuthority]
  >
>;
