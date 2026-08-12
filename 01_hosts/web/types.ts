/**
 * Web host topology and capability composition.
 *
 * Twelve numbered homes in dependency order, each owning one distinct
 * physical authority. The topology follows core's ordered pattern — named
 * entries in an exact tuple — so order, membership, and surface association
 * are all type-level facts a mutation can break, not a union pretending to be
 * a sequence. The roster is lawful because all twelve directories physically
 * exist in the same architecture fold.
 *
 * The capability topology composes every home's declared grounding slots and
 * offers into one inspectable surface: which browser authorities enter as
 * groundings, which are constructed through offers, what each offer requires
 * and provides, and where each declaration lives. The erased web host catalog
 * derives from these declarations, and that the derivation is faithful is a
 * `system/assurance` obligation.
 *
 * @module
 */

import type { Assert, Equal, Named, Tuple } from '../../types.js';
import type { GroundingId, RealizationOfferId } from '../../00_core/14_compiler/types.js';
import type { RealizationCatalog } from '../types.js';
import type { WebBootstrapTypeSurface } from './00_bootstrap/types.js';
import type {
  ApplicationMountGrounding,
  InvocationMountGrounding,
  RegionAuthority,
  RegionAuthorityOffer,
  RegionDiscoveryGrounding,
  WebRegionTypeSurface,
} from './01_region/types.js';
import type { SinkPolicyGrounding, WebSecurityTypeSurface } from './02_security/types.js';
import type {
  EventAuthorityOffer,
  EventFacilityGrounding,
  WebEventTypeSurface,
} from './03_event/types.js';
import type {
  CommitApplicationOffer,
  RendererCatalogGrounding,
  WebProjectionTypeSurface,
} from './04_projection/types.js';
import type { ProbeFacilityGrounding, WebEvidenceTypeSurface } from './05_evidence/types.js';
import type {
  TransportAuthority,
  TransportAuthorityOffer,
  TransportFacilityGrounding,
  WebTransportTypeSurface,
} from './06_transport/types.js';
import type {
  DatabaseFacilityGrounding,
  WebPersistenceTypeSurface,
  WebStoreOffer,
} from './07_persistence/types.js';
import type {
  AudioFacilityGrounding,
  AudioRuntimeOffer,
  InjectedAudioRuntimeGrounding,
  MediaAuthorityOffer,
  SampleClockTransport,
  WebMediaTypeSurface,
} from './08_media/types.js';
import type {
  GpuAccessGrounding,
  GraphicsAuthorityOffer,
  GraphicsLoss,
  WebGraphicsTypeSurface,
} from './09_graphics/types.js';
import type {
  ExecutionHostOffer,
  PreparationOffer,
  SchedulingFacilityGrounding,
  WebExecutionTypeSurface,
} from './10_execution/types.js';
import type { IslandActivationOffer, WebIslandTypeSurface } from './11_island/types.js';
import type { CaptureAuthorityOffer, WebCaptureTypeSurface } from './12_capture/types.js';

/** The thirteen web homes, in numbered dependency order. */
export type WebHomeName =
  | '00_bootstrap'
  | '01_region'
  | '02_security'
  | '03_event'
  | '04_projection'
  | '05_evidence'
  | '06_transport'
  | '07_persistence'
  | '08_media'
  | '09_graphics'
  | '10_execution'
  | '11_island'
  | '12_capture';

/** One owner and the semantic surface its local `types.ts` declares. */
export interface WebTypeHome<Name extends WebHomeName, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/** Complete ordered web type waterfall. */
export type WebTypeTopology = Tuple<[
  WebTypeHome<'00_bootstrap', WebBootstrapTypeSurface>,
  WebTypeHome<'01_region', WebRegionTypeSurface>,
  WebTypeHome<'02_security', WebSecurityTypeSurface>,
  WebTypeHome<'03_event', WebEventTypeSurface>,
  WebTypeHome<'04_projection', WebProjectionTypeSurface>,
  WebTypeHome<'05_evidence', WebEvidenceTypeSurface>,
  WebTypeHome<'06_transport', WebTransportTypeSurface>,
  WebTypeHome<'07_persistence', WebPersistenceTypeSurface>,
  WebTypeHome<'08_media', WebMediaTypeSurface>,
  WebTypeHome<'09_graphics', WebGraphicsTypeSurface>,
  WebTypeHome<'10_execution', WebExecutionTypeSurface>,
  WebTypeHome<'11_island', WebIslandTypeSurface>,
  WebTypeHome<'12_capture', WebCaptureTypeSurface>
]>;

/** Select one owner surface by its source-home name. */
export type WebTypeAt<Name extends WebHomeName> = Extract<
  WebTypeTopology[number],
  { readonly name: Name }
>['Type'];

/** Name-indexed view used by assurance and agents, not by owner implementations. */
export interface WebTypeSurface {
  readonly bootstrap: WebBootstrapTypeSurface;
  readonly region: WebRegionTypeSurface;
  readonly security: WebSecurityTypeSurface;
  readonly event: WebEventTypeSurface;
  readonly projection: WebProjectionTypeSurface;
  readonly evidence: WebEvidenceTypeSurface;
  readonly transport: WebTransportTypeSurface;
  readonly persistence: WebPersistenceTypeSurface;
  readonly media: WebMediaTypeSurface;
  readonly graphics: WebGraphicsTypeSurface;
  readonly execution: WebExecutionTypeSurface;
  readonly island: WebIslandTypeSurface;
  readonly capture: WebCaptureTypeSurface;
}

/**
 * The inspectable web capability composition: every declared grounding slot
 * and every declared offer, by owning home. This is what the erased web host
 * catalog derives from.
 */
export interface WebCapabilityTopology {
  readonly groundings: {
    readonly regionDiscovery: RegionDiscoveryGrounding;
    readonly applicationMount: ApplicationMountGrounding;
    readonly invocationMount: InvocationMountGrounding;
    readonly sinkPolicy: SinkPolicyGrounding;
    readonly rendererCatalog: RendererCatalogGrounding;
    readonly eventFacility: EventFacilityGrounding;
    readonly probeFacility: ProbeFacilityGrounding;
    readonly transportFacility: TransportFacilityGrounding;
    readonly databaseFacility: DatabaseFacilityGrounding;
    readonly audioFacility: AudioFacilityGrounding;
    readonly injectedAudioRuntime: InjectedAudioRuntimeGrounding;
    readonly gpuAccess: GpuAccessGrounding;
    readonly schedulingFacility: SchedulingFacilityGrounding;
  };
  readonly offers: {
    readonly regionAuthority: RegionAuthorityOffer;
    readonly eventAuthority: EventAuthorityOffer;
    readonly commitApplication: CommitApplicationOffer;
    readonly transportAuthority: TransportAuthorityOffer;
    readonly store: WebStoreOffer;
    readonly audioRuntime: AudioRuntimeOffer;
    readonly mediaAuthority: MediaAuthorityOffer;
    readonly graphicsAuthority: GraphicsAuthorityOffer;
    readonly executionHost: ExecutionHostOffer;
    readonly preparation: PreparationOffer;
    readonly islandActivation: IslandActivationOffer;
    readonly captureAuthority: CaptureAuthorityOffer;
  };
  readonly erased: RealizationCatalog;
}

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

/** Compile-time law: the roster and the tuple carry the same population. */
export type TheRosterAndTheTupleAgree = Assert<
  Equal<WebTypeTopology[number]['name'], WebHomeName>
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

/** Compile-time law: the grounding population is exact — a slot cannot silently vanish. */
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
    | 'schedulingFacility'
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
