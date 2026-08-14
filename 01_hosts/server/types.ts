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

import type {
  Named,
  Tuple,
} from '../../types.js';

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
  SecretProviderOffer,
  SecretSourceGrounding,
  ServerSecretTypeSurface,
} from './02_secret/types.js';
import type {
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
  DatabaseProviderOffer,
  ServerDatabaseTypeSurface,
} from './05_database/types.js';
import type { ServerServiceTypeSurface, ServiceAuthorityOffer } from './06_service/types.js';
import type {
  ServerToolTypeSurface,
  ToolAuthorityOffer,
  ToolCatalogGrounding,
} from './07_tool/types.js';
import type {
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
