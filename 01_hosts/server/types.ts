/**
 * Server: the trusted general-purpose realm's semantic topology.
 *
 * Eleven numbered homes in dependency order, one inspectable capability
 * composition, and the exact identity gate over every declared grounding and
 * offer. Server owns process, secrets, scoped filesystem, network, database,
 * services, native tools, execution, trusted operation handlers, and native
 * media — as a capability host, never as an application runtime: routing,
 * wires, DI containers, and business meaning live elsewhere.
 *
 * @module
 */

import type { Assert, Equal, Named, Tuple } from '../../types.js';
import type { GroundingId, RealizationOfferId } from '../../00_core/14_compiler/types.js';
import type { RealizationCatalog } from '../types.js';
import type {
  ServerBootstrapTypeSurface,
  ServerConfigurationGrounding,
  ServerEntryGrounding,
} from './00_bootstrap/types.js';
import type {
  ChildProcessOffer,
  ProcessFacilityGrounding,
  ServerProcessTypeSurface,
} from './01_process/types.js';
import type {
  SecretProvider,
  SecretProviderOffer,
  SecretSourceGrounding,
  ServerSecretTypeSurface,
} from './02_secret/types.js';
import type {
  FilesystemProvider,
  FilesystemProviderOffer,
  FilesystemRootGrounding,
  ServerFilesystemTypeSurface,
} from './03_filesystem/types.js';
import type {
  ServerNetworkFacilityGrounding,
  ServerNetworkOffer,
  ServerNetworkTypeSurface,
} from './04_network/types.js';
import type {
  DatabaseEndpointGrounding,
  DatabaseProvider,
  DatabaseProviderOffer,
  ServerDatabaseTypeSurface,
} from './05_database/types.js';
import type { ServerServiceTypeSurface, ServiceAuthorityOffer } from './06_service/types.js';
import type {
  ServerToolTypeSurface,
  ToolAuthority,
  ToolAuthorityOffer,
  ToolCatalogGrounding,
} from './07_tool/types.js';
import type {
  ServerExecutionHost,
  ServerExecutionOffer,
  ServerExecutionTypeSurface,
  ServerSchedulingGrounding,
} from './08_execution/types.js';
import type {
  OperationCatalogGrounding,
  ServerOperationOffer,
  ServerOperationTypeSurface,
} from './09_operation/types.js';
import type {
  ServerCodecAdmissionGrounding,
  ServerMediaOffer,
  ServerMediaTypeSurface,
} from './10_media/types.js';

/** One owner and the semantic surface its local `types.ts` declares. */
export interface ServerTypeHome<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/** Complete ordered server type waterfall. */
export type ServerTypeTopology = Tuple<[
  ServerTypeHome<'00_bootstrap', ServerBootstrapTypeSurface>,
  ServerTypeHome<'01_process', ServerProcessTypeSurface>,
  ServerTypeHome<'02_secret', ServerSecretTypeSurface>,
  ServerTypeHome<'03_filesystem', ServerFilesystemTypeSurface>,
  ServerTypeHome<'04_network', ServerNetworkTypeSurface>,
  ServerTypeHome<'05_database', ServerDatabaseTypeSurface>,
  ServerTypeHome<'06_service', ServerServiceTypeSurface>,
  ServerTypeHome<'07_tool', ServerToolTypeSurface>,
  ServerTypeHome<'08_execution', ServerExecutionTypeSurface>,
  ServerTypeHome<'09_operation', ServerOperationTypeSurface>,
  ServerTypeHome<'10_media', ServerMediaTypeSurface>
]>;

/**
 * Stable source-home names in numbered dependency order.
 *
 * Derived from the topology. A hand-written union beside a hand-written tuple
 * is one population twice, and the law that compared them was a confession
 * rather than a proof.
 */
export type ServerHomeName = ServerTypeTopology[number]['name'];

/** Select one owner surface by its source-home name. */
export type ServerTypeAt<Name extends ServerHomeName> = Extract<
  ServerTypeTopology[number],
  { readonly name: Name }
>['Type'];

/**
 * The inspectable server capability composition: every declared grounding
 * slot and every declared offer, by owning home, plus the erased catalog.
 */
export interface ServerCapabilityTopology {
  readonly groundings: {
    readonly processEntry: ServerEntryGrounding;
    readonly configuration: ServerConfigurationGrounding;
    readonly processFacility: ProcessFacilityGrounding;
    readonly secretSource: SecretSourceGrounding;
    readonly filesystemRoot: FilesystemRootGrounding;
    readonly networkFacility: ServerNetworkFacilityGrounding;
    readonly databaseEndpoint: DatabaseEndpointGrounding;
    readonly toolCatalog: ToolCatalogGrounding;
    readonly codecAdmission: ServerCodecAdmissionGrounding;
    readonly schedulingFacility: ServerSchedulingGrounding;
    readonly operationCatalog: OperationCatalogGrounding;
  };
  readonly offers: {
    readonly childProcess: ChildProcessOffer;
    readonly secretProvider: SecretProviderOffer;
    readonly filesystemProvider: FilesystemProviderOffer;
    readonly networkAuthority: ServerNetworkOffer;
    readonly databaseProvider: DatabaseProviderOffer;
    readonly serviceAuthority: ServiceAuthorityOffer;
    readonly toolAuthority: ToolAuthorityOffer;
    readonly executionHost: ServerExecutionOffer;
    readonly operationHandler: ServerOperationOffer;
    readonly mediaAuthority: ServerMediaOffer;
  };
  readonly erased: RealizationCatalog;
}

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/** Compile-time law: the topology is ordered — position by position, exactly. */
export type TheServerTopologyIsOrderedExactly = Assert<
  Equal<
    [
      ServerTypeTopology[0]['name'],
      ServerTypeTopology[1]['name'],
      ServerTypeTopology[2]['name'],
      ServerTypeTopology[3]['name'],
      ServerTypeTopology[4]['name'],
      ServerTypeTopology[5]['name'],
      ServerTypeTopology[6]['name'],
      ServerTypeTopology[7]['name'],
      ServerTypeTopology[8]['name'],
      ServerTypeTopology[9]['name'],
      ServerTypeTopology[10]['name'],
    ],
    [
      '00_bootstrap',
      '01_process',
      '02_secret',
      '03_filesystem',
      '04_network',
      '05_database',
      '06_service',
      '07_tool',
      '08_execution',
      '09_operation',
      '10_media',
    ]
  >
>;

/** Compile-time law: every home resolves to its own surface. */
export type EachServerHomeResolvesToItsOwnSurface = Assert<
  Equal<
    [
      ServerTypeAt<'00_bootstrap'>,
      ServerTypeAt<'01_process'>,
      ServerTypeAt<'02_secret'>,
      ServerTypeAt<'03_filesystem'>,
      ServerTypeAt<'04_network'>,
      ServerTypeAt<'05_database'>,
      ServerTypeAt<'06_service'>,
      ServerTypeAt<'07_tool'>,
      ServerTypeAt<'08_execution'>,
      ServerTypeAt<'09_operation'>,
      ServerTypeAt<'10_media'>,
    ],
    [
      ServerBootstrapTypeSurface,
      ServerProcessTypeSurface,
      ServerSecretTypeSurface,
      ServerFilesystemTypeSurface,
      ServerNetworkTypeSurface,
      ServerDatabaseTypeSurface,
      ServerServiceTypeSurface,
      ServerToolTypeSurface,
      ServerExecutionTypeSurface,
      ServerOperationTypeSurface,
      ServerMediaTypeSurface,
    ]
  >
>;

/** Compile-time law: the grounding population is exact. */
export type TheServerGroundingPopulationIsExact = Assert<
  Equal<
    keyof ServerCapabilityTopology['groundings'],
    | 'processEntry'
    | 'configuration'
    | 'processFacility'
    | 'secretSource'
    | 'filesystemRoot'
    | 'networkFacility'
    | 'databaseEndpoint'
    | 'toolCatalog'
    | 'codecAdmission'
    | 'schedulingFacility'
    | 'operationCatalog'
  >
>;

/** Compile-time law: the offer population is exact. */
export type TheServerOfferPopulationIsExact = Assert<
  Equal<
    keyof ServerCapabilityTopology['offers'],
    | 'childProcess'
    | 'secretProvider'
    | 'filesystemProvider'
    | 'networkAuthority'
    | 'databaseProvider'
    | 'serviceAuthority'
    | 'toolAuthority'
    | 'executionHost'
    | 'operationHandler'
    | 'mediaAuthority'
  >
>;

/** Compile-time law: the topology carries its erased catalog beside the typed rosters. */
export type TheServerTopologyCarriesItsErasedCatalog = Assert<
  Equal<ServerCapabilityTopology['erased'], RealizationCatalog>
>;

/**
 * Compile-time law: every declaration pins its exact identity — all ten
 * grounding slots and all ten offers, twenty pinned capability declarations.
 */
export type EveryServerDeclarationPinsItsExactIdentity = Assert<
  Equal<
    [
      ServerCapabilityTopology['groundings']['processEntry']['id'],
      ServerCapabilityTopology['groundings']['configuration']['id'],
      ServerCapabilityTopology['groundings']['processFacility']['id'],
      ServerCapabilityTopology['groundings']['secretSource']['id'],
      ServerCapabilityTopology['groundings']['filesystemRoot']['id'],
      ServerCapabilityTopology['groundings']['networkFacility']['id'],
      ServerCapabilityTopology['groundings']['databaseEndpoint']['id'],
      ServerCapabilityTopology['groundings']['toolCatalog']['id'],
      ServerCapabilityTopology['groundings']['schedulingFacility']['id'],
      ServerCapabilityTopology['groundings']['operationCatalog']['id'],
      ServerCapabilityTopology['offers']['childProcess']['id'],
      ServerCapabilityTopology['offers']['secretProvider']['id'],
      ServerCapabilityTopology['offers']['filesystemProvider']['id'],
      ServerCapabilityTopology['offers']['networkAuthority']['id'],
      ServerCapabilityTopology['offers']['databaseProvider']['id'],
      ServerCapabilityTopology['offers']['serviceAuthority']['id'],
      ServerCapabilityTopology['offers']['toolAuthority']['id'],
      ServerCapabilityTopology['offers']['executionHost']['id'],
      ServerCapabilityTopology['offers']['operationHandler']['id'],
      ServerCapabilityTopology['offers']['mediaAuthority']['id'],
    ],
    [
      GroundingId<'liteship.server.grounding.process-entry'>,
      GroundingId<'liteship.server.grounding.configuration'>,
      GroundingId<'liteship.server.grounding.process-facility'>,
      GroundingId<'liteship.server.grounding.secret-source'>,
      GroundingId<'liteship.server.grounding.filesystem-root'>,
      GroundingId<'liteship.server.grounding.network-facility'>,
      GroundingId<'liteship.server.grounding.database-endpoint'>,
      GroundingId<'liteship.server.grounding.tool-catalog'>,
      GroundingId<'liteship.server.grounding.scheduling-facility'>,
      GroundingId<'liteship.server.grounding.operation-catalog'>,
      RealizationOfferId<'liteship.server.offer.child-process'>,
      RealizationOfferId<'liteship.server.offer.secret-provider'>,
      RealizationOfferId<'liteship.server.offer.filesystem-provider'>,
      RealizationOfferId<'liteship.server.offer.network-authority'>,
      RealizationOfferId<'liteship.server.offer.database-provider'>,
      RealizationOfferId<'liteship.server.offer.service-authority'>,
      RealizationOfferId<'liteship.server.offer.tool-authority'>,
      RealizationOfferId<'liteship.server.offer.execution-host'>,
      RealizationOfferId<'liteship.server.offer.operation-handler'>,
      RealizationOfferId<'liteship.server.offer.media-authority'>,
    ]
  >
>;

/**
 * Compile-time law: load-bearing surface members stay their declared types —
 * a surface cannot quietly blur its secret provider, filesystem provider,
 * database provider, tool authority, or execution host to `unknown`.
 */
export type ServerSurfacesCarryTheirDeclaredMembers = Assert<
  Equal<
    [
      ServerTypeAt<'02_secret'>['provider'],
      ServerTypeAt<'03_filesystem'>['provider'],
      ServerTypeAt<'05_database'>['provider'],
      ServerTypeAt<'07_tool'>['authority'],
      ServerTypeAt<'08_execution'>['host'],
    ],
    [SecretProvider, FilesystemProvider, DatabaseProvider, ToolAuthority, ServerExecutionHost]
  >
>;
