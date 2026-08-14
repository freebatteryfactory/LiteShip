/**
 * Web host topology and capability composition.
 *
 * Thirteen numbered homes in dependency order, each owning one distinct
 * physical authority. The topology follows core's ordered pattern — named
 * entries in an exact tuple — so order, membership, and surface association
 * are all type-level facts a mutation can break, not a union pretending to be
 * a sequence. The roster is lawful because all thirteen directories physically
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

import type {
  Named,
  Tuple,
  WithoutOrdinalPrefix,
} from '../../types.js';

import type { RealizationCatalog } from '../types.js';
import type { WebBootstrapTypeSurface } from './00_bootstrap/types.js';
import type {
  ApplicationMountGrounding,
  InvocationMountGrounding,
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
  CodecAdmissionGrounding,
  InjectedAudioRuntimeGrounding,
  MediaAuthorityOffer,
  WebCodecOffer,
  WebMediaTypeSurface,
} from './08_media/types.js';
import type {
  GpuAccessGrounding,
  GraphicsAuthorityOffer,
  WebGraphicsTypeSurface,
} from './09_graphics/types.js';
import type {
  ExecutionHostOffer,
  PreparationOffer,
  SchedulingFacilityGrounding,
  WebExecutionTypeSurface,
} from './10_execution/types.js';
import type { IslandActivationOffer, WebIslandTypeSurface } from './11_island/types.js';
import type {
  CaptureAuthorityOffer,
  CaptureFacilityGrounding,
  WebCaptureTypeSurface,
} from './12_capture/types.js';

/** One owner and the semantic surface its local `types.ts` declares. */
export interface WebTypeHome<Name extends string, Surface> extends Named<Name> {
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

/**
 * Stable source-home names in numbered dependency order.
 *
 * Derived from the topology. A hand-written union beside a hand-written tuple
 * is one population twice, and the law that compared them was a confession
 * rather than a proof.
 */
export type WebHomeName = WebTypeTopology[number]['name'];

/** Select one owner surface by its source-home name. */
export type WebTypeAt<Name extends WebHomeName> = Extract<
  WebTypeTopology[number],
  { readonly name: Name }
>['Type'];

/** Name-indexed view used by assurance and agents, not by owner implementations. */
export type WebTypeSurface = {
  readonly [Home in WebTypeTopology[number] as WithoutOrdinalPrefix<Home['name']>]: Home['Type'];
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
    readonly captureFacility: CaptureFacilityGrounding;
    readonly codecAdmission: CodecAdmissionGrounding;
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
    readonly codec: WebCodecOffer;
  };
  readonly erased: RealizationCatalog;
}
