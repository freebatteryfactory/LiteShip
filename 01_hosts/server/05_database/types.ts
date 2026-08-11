/**
 * Database providers: pools, connections, transaction leases, exact ports.
 *
 * This home owns database-provider authority: exact database identity,
 * per-use connection resources, per-commit transaction leases that are never
 * long-lived bindings, exact realization of core store ports, migration
 * execution facilities, change feeds, lifecycle, and failure. It realizes
 * exact upstream ports without becoming a database semantic framework —
 * query meaning, schema meaning, and state meaning are core's.
 *
 * @module
 */

import type {
  Assert,
  BindingsFor,
  Brand,
  CaseOf,
  Equal,
  Hole,
  InputOf,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
  UniqueRequirements,
} from '../../../types.js';
import type { CanonicalValue, ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { SchemaId, SchemaReference } from '../../../00_core/03_schema/types.js';
import type {
  BlobStoreRequirement,
  ChangeLogRequirement,
  RevisionStoreRequirement,
  SnapshotStoreRequirement,
} from '../../../00_core/08_state/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { Deadline } from '../../../00_core/05_lifecycle/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';
import type { SecretProviderRequirement } from '../02_secret/types.js';

export type DatabaseId<Name extends string = string> = Brand<Name, 'liteship.server.database-id'>;
export type DatabaseReference<Id extends DatabaseId = DatabaseId> = Reference<
  'server-database',
  Id
>;
export type DatabaseConnectionId = Brand<string, 'liteship.server.database-connection-id'>;
export type DatabaseConnectionReference = Reference<'server-database-connection', DatabaseConnectionId>;

/** The store ports a server database may realize — exactly the core four. */
export type ServerStorePortRequirement =
  | RevisionStoreRequirement
  | SnapshotStoreRequirement
  | ChangeLogRequirement
  | BlobStoreRequirement;

/** A non-empty exact subset of the store ports. */
export type ServerStoreRow = readonly [ServerStorePortRequirement, ...ServerStorePortRequirement[]];

/** One pool: the durable acquisition point connections come from. */
export interface DatabasePool {
  readonly database: DatabaseReference;
  readonly acquire: Signature<DatabaseReference, DatabaseConnection, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The complete statement request: exact connection, both contracts, and the deadline. */
export interface StatementRequest {
  readonly connection: DatabaseConnectionReference;
  readonly input: SchemaReference<SchemaId, unknown>;
  readonly output: SchemaReference<SchemaId, unknown>;
  readonly deadline: Deadline;
}

/** One statement resource: contract-bound, deadline-governed execution, cancellable, owned. */
export interface StatementResource {
  readonly connection: DatabaseConnectionReference;
  readonly input: SchemaReference<SchemaId, unknown>;
  readonly output: SchemaReference<SchemaId, unknown>;
  readonly deadline: Deadline;
  readonly execute: Signature<CanonicalValue, CanonicalValue, NonEmptyTuple<Diagnostic>>;
  readonly cancel: Signature<DatabaseConnectionReference, DatabaseConnectionReference, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The addressed migration artifact. */
export type MigrationAddress = ContentAddress<'application/vnd.liteship.server-migration+cbor'>;

/** The migration execution facility: applies an addressed migration at a generation. */
export interface MigrationExecutionFacility {
  readonly apply: Signature<MigrationAddress, TransactionGeneration, NonEmptyTuple<Diagnostic>>;
}

/** One live connection: a per-use owned resource from the pool. */
export interface DatabaseConnection {
  readonly id: DatabaseConnectionReference;
  readonly database: DatabaseReference;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The complete lease request: exact connection and the generation it serves. */
export interface TransactionLeaseRequest {
  readonly connection: DatabaseConnectionReference;
  readonly generation: TransactionGeneration;
}

/**
 * One transaction lease: issued per commit for one exact connection and one
 * exact generation, with commit and rollback closing it. A lease is never
 * the long-lived binding — the provider is.
 */
export interface TransactionLease {
  readonly connection: DatabaseConnectionReference;
  readonly generation: TransactionGeneration;
  readonly commit: Signature<TransactionGeneration, DatabaseConnectionReference, NonEmptyTuple<Diagnostic>>;
  readonly rollback: Signature<TransactionGeneration, DatabaseConnectionReference, NonEmptyTuple<Diagnostic>>;
}

/** One change-feed resource over one exact database. */
export interface ChangeFeedResource {
  readonly database: DatabaseReference;
  readonly receive: Signature<
    TransactionGeneration,
    readonly TransactionGeneration[],
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * The database provider: connections are per-use resources, leases are
 * issued per generation, and port realization returns exact binding rows.
 */
export interface DatabaseProvider {
  readonly database: DatabaseReference;
  readonly pool: Signature<DatabaseReference, DatabasePool, NonEmptyTuple<Diagnostic>>;
  readonly connect: Signature<DatabaseReference, DatabaseConnection, NonEmptyTuple<Diagnostic>>;
  readonly lease: Signature<TransactionLeaseRequest, TransactionLease, NonEmptyTuple<Diagnostic>>;
  readonly statement: Signature<StatementRequest, StatementResource, NonEmptyTuple<Diagnostic>>;
  readonly migration: MigrationExecutionFacility;
  readonly construct: <Row extends ServerStoreRow>(
    row: UniqueRequirements<Row>,
  ) => Result<BindingsFor<Row>, NonEmptyTuple<Diagnostic>>;
  readonly feed: Signature<DatabaseReference, ChangeFeedResource, NonEmptyTuple<Diagnostic>>;
}

/** The admitted deployment endpoint beneath the provider. */
export interface DatabaseEndpointBinding {
  readonly admitted: true;
}

export type DatabaseEndpointRequirement = Hole<
  'liteship.server.database-endpoint',
  DatabaseEndpointBinding
>;
export type DatabaseProviderRequirement = Hole<'liteship.server.database', DatabaseProvider>;

/** Deployment grounding: the database endpoint enters admitted. */
export interface DatabaseEndpointGrounding
  extends ServerGroundingDefinition<
    readonly [DatabaseEndpointRequirement],
    unknown,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.database-endpoint'>;
}

/** Constructing the database provider: credentials come from the secret provider. */
export interface DatabaseProviderOffer
  extends ServerRealizationOffer<
    readonly [DatabaseProviderRequirement],
    readonly [DatabaseEndpointRequirement, SecretProviderRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.database-provider'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// Transaction isolation, commit/rollback correctness, and connection
// lifecycle honoring are runtime `system/assurance` obligations; pool sizes
// and timeouts are empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: a lease is issued per generation for one exact connection. */
export type ALeaseIsIssuedPerGeneration = Assert<
  Equal<
    [TransactionLease['generation'], InputOf<DatabaseProvider['lease']>, InputOf<TransactionLease['commit']>],
    [TransactionGeneration, TransactionLeaseRequest, TransactionGeneration]
  >
>;

/**
 * Compile-time law: the provider carries the pool, statement, and migration
 * paths — statements are contract-bound, cancellable, owned resources, and
 * migration applies an addressed artifact at a generation.
 */
export type ThePoolStatementAndMigrationPathsAreReal = Assert<
  Equal<
    [
      DatabaseProvider['pool'],
      DatabaseProvider['statement'],
      DatabaseProvider['migration']['apply'],
      StatementRequest['deadline'],
      StatementResource['deadline'],
      StatementResource['lifecycle'],
    ],
    [
      Signature<DatabaseReference, DatabasePool, NonEmptyTuple<Diagnostic>>,
      Signature<StatementRequest, StatementResource, NonEmptyTuple<Diagnostic>>,
      Signature<MigrationAddress, TransactionGeneration, NonEmptyTuple<Diagnostic>>,
      Deadline,
      Deadline,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;

/** Compile-time law: provider, connection, and lease are three distinct altitudes. */
export type ProviderConnectionAndLeaseAreDistinct = Assert<
  Equal<
    [
      DatabaseConnection extends TransactionLease ? true : false,
      TransactionLease extends DatabaseConnection ? true : false,
      DatabaseConnection['lifecycle'],
    ],
    [false, false, CaseOf<RealizationLifecycle, 'owned'>]
  >
>;

/** Compile-time law: port realization returns exact bindings for the exact unique row. */
export type DatabaseConstructionReturnsExactBindings = Assert<
  Equal<
    DatabaseProvider['construct'],
    <Row extends ServerStoreRow>(
      row: UniqueRequirements<Row>,
    ) => Result<BindingsFor<Row>, NonEmptyTuple<Diagnostic>>
  >
>;

/** Compile-time law: the credentials path is the secret provider — by requirement row. */
export type CredentialsComeFromTheSecretProvider = Assert<
  Equal<
    DatabaseProviderOffer['requires'],
    readonly [DatabaseEndpointRequirement, SecretProviderRequirement]
  >
>;

/** Type summary consumed by the server topology. */
export interface ServerDatabaseTypeSurface {
  readonly provider: DatabaseProvider;
  readonly pool: DatabasePool;
  readonly statement: StatementResource;
  readonly connection: DatabaseConnection;
  readonly lease: TransactionLease;
  readonly feed: ChangeFeedResource;
  readonly endpointGrounding: DatabaseEndpointGrounding;
  readonly databaseOffer: DatabaseProviderOffer;
}
