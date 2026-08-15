/**
 * Compile-time laws for `01_hosts/server`.
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
import type { ServerBootstrapTypeSurface, ServerConfiguration, ServerProcessEntry } from './00_bootstrap/types.js';
import type { HostProcessAuthority, ServerProcessTypeSurface } from './01_process/types.js';
import type { SecretProvider, SecretSourceBinding, ServerSecretTypeSurface } from './02_secret/types.js';
import type { FilesystemProvider, FilesystemRootBinding, ServerFilesystemTypeSurface } from './03_filesystem/types.js';
import type { ServerNetworkFacility, ServerNetworkTypeSurface } from './04_network/types.js';
import type { DatabaseEndpointBinding, DatabaseProvider, ServerDatabaseTypeSurface } from './05_database/types.js';
import type { ServerServiceTypeSurface } from './06_service/types.js';
import type { ServerToolTypeSurface, ToolAuthority, ToolCatalogBinding } from './07_tool/types.js';
import type { ServerExecutionHost, ServerExecutionTypeSurface, ServerSchedulingFacility } from './08_execution/types.js';
import type { OperationCatalogBinding, ServerOperationTypeSurface } from './09_operation/types.js';
import type { ServerCodecAdmission, ServerMediaTypeSurface } from './10_media/types.js';
import type { ServerCapabilityTopology, ServerTypeAt, ServerTypeTopology } from './types.js';


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

/** Compile-time law: every server grounding admits the exact supplied host or deployment fact. */
export type EveryServerGroundingAdmitsItsExactSuppliedInput = Assert<
  Equal<
    [
      InputOf<ServerCapabilityTopology['groundings']['processEntry']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['configuration']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['processFacility']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['secretSource']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['filesystemRoot']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['networkFacility']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['databaseEndpoint']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['toolCatalog']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['codecAdmission']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['schedulingFacility']['admit']>,
      InputOf<ServerCapabilityTopology['groundings']['operationCatalog']['admit']>,
    ],
    [
      ServerProcessEntry,
      ServerConfiguration,
      HostProcessAuthority,
      SecretSourceBinding,
      FilesystemRootBinding,
      ServerNetworkFacility,
      DatabaseEndpointBinding,
      ToolCatalogBinding,
      ServerCodecAdmission,
      ServerSchedulingFacility,
      OperationCatalogBinding,
    ]
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
