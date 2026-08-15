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
  Algebra,
  BindingsFor,
  Brand,
  CaseOf,
  Hole,
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
import type { CancellationReceipt, Deadline } from '../../../00_core/05_lifecycle/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';
import type { SecretProviderRequirement } from '../02_secret/types.js';

export type DatabaseId<Name extends string = string> = Brand<Name, 'liteship.server.database-id'>;
export type DatabaseReference<Id extends DatabaseId = DatabaseId> = Reference<
  'server-database',
  Id
>;
export type DatabaseConnectionId<Name extends string = string> = Brand<
  Name,
  'liteship.server.database-connection-id'
>;
export type DatabaseConnectionReference<Id extends DatabaseConnectionId = DatabaseConnectionId> = Reference<
  'server-database-connection',
  Id
>;
export type StatementId<Name extends string = string> = Brand<Name, 'liteship.server.statement-id'>;
export type StatementReference<Id extends StatementId = StatementId> = Reference<'server-statement', Id>;
export type TransactionId<Name extends string = string> = Brand<Name, 'liteship.server.transaction-id'>;
export type TransactionReference<Id extends TransactionId = TransactionId> = Reference<'server-transaction', Id>;

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
export interface StatementRequest<Id extends StatementId = StatementId> {
  readonly statement: StatementReference<Id>;
  readonly connection: DatabaseConnectionReference;
  readonly input: SchemaReference<SchemaId, unknown>;
  readonly output: SchemaReference<SchemaId, unknown>;
  readonly deadline: Deadline;
}

/** One statement resource: contract-bound, deadline-governed execution, cancellable, owned. */
export interface StatementResource<Id extends StatementId = StatementId> {
  readonly id: StatementReference<Id>;
  readonly connection: DatabaseConnectionReference;
  readonly input: SchemaReference<SchemaId, unknown>;
  readonly output: SchemaReference<SchemaId, unknown>;
  readonly deadline: Deadline;
  readonly execute: Signature<CanonicalValue, CanonicalValue, NonEmptyTuple<Diagnostic>>;
  readonly cancel: Signature<
    StatementReference<Id>,
    CancellationReceipt<StatementReference<Id>>,
    NonEmptyTuple<Diagnostic>
  >;
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
export interface TransactionLeaseRequest<Id extends TransactionId = TransactionId> {
  readonly transaction: TransactionReference<Id>;
  readonly connection: DatabaseConnectionReference;
  readonly generation: TransactionGeneration;
}

/** Finalization of one exact transaction, including the custody returned to its provider. */
export type TransactionFinalizationReceipt<Id extends TransactionId = TransactionId> = Algebra<{
  committed: {
    readonly transaction: TransactionReference<Id>;
    readonly terminalGeneration: TransactionGeneration;
    readonly diagnostics: readonly Diagnostic[];
    readonly returned: DatabaseConnectionReference;
  };
  rolledBack: {
    readonly transaction: TransactionReference<Id>;
    readonly terminalGeneration: TransactionGeneration;
    readonly diagnostics: readonly Diagnostic[];
    readonly returned: DatabaseConnectionReference;
  };
}>;

/**
 * One transaction lease: issued per commit for one exact connection and one
 * exact generation, with commit and rollback closing it. A lease is never
 * the long-lived binding — the provider is.
 */
export interface TransactionLease<Id extends TransactionId = TransactionId> {
  readonly id: TransactionReference<Id>;
  readonly connection: DatabaseConnectionReference;
  readonly generation: TransactionGeneration;
  readonly commit: Signature<
    TransactionReference<Id>,
    CaseOf<TransactionFinalizationReceipt<Id>, 'committed'>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly rollback: Signature<
    TransactionReference<Id>,
    CaseOf<TransactionFinalizationReceipt<Id>, 'rolledBack'>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
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
  readonly lease: <Id extends TransactionId>(
    request: TransactionLeaseRequest<Id>,
  ) => Result<TransactionLease<Id>, NonEmptyTuple<Diagnostic>>;
  readonly statement: <Id extends StatementId>(
    request: StatementRequest<Id>,
  ) => Result<StatementResource<Id>, NonEmptyTuple<Diagnostic>>;
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
    DatabaseEndpointBinding,
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
