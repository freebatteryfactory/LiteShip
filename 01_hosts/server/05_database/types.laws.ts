/**
 * Compile-time laws for `01_hosts/server/05_database`.
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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { CancellationReceipt, Deadline } from '../../../00_core/05_lifecycle/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, BindingsFor, CaseOf, Equal, InputOf, NonEmptyTuple, Result, Signature, UniqueRequirements } from '../../../types.js';
import type { SecretProviderRequirement } from '../02_secret/types.js';
import type { DatabaseConnection, DatabaseEndpointBinding, DatabaseEndpointRequirement, DatabasePool, DatabaseProvider, DatabaseProviderOffer, DatabaseReference, MigrationAddress, ServerStoreRow, StatementId, StatementReference, StatementRequest, StatementResource, TransactionFinalizationReceipt, TransactionId, TransactionLease, TransactionLeaseRequest, TransactionReference } from './types.js';

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
    [
      TransactionLease<TransactionId<'liteship.server.db.law.tx-a'>>['generation'],
      DatabaseProvider['lease'] extends (
        request: TransactionLeaseRequest<TransactionId<'liteship.server.db.law.tx-a'>>,
      ) => Result<
        TransactionLease<TransactionId<'liteship.server.db.law.tx-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      InputOf<TransactionLease<TransactionId<'liteship.server.db.law.tx-a'>>['commit']>,
      CaseOf<
        TransactionFinalizationReceipt<TransactionId<'liteship.server.db.law.tx-a'>>,
        'committed'
      >['transaction'],
    ],
    [
      TransactionGeneration,
      true,
      TransactionReference<TransactionId<'liteship.server.db.law.tx-a'>>,
      TransactionReference<TransactionId<'liteship.server.db.law.tx-a'>>,
    ]
  >
>;

/** Compile-time law: deployment supplies the exact database and addressed endpoint profile. */
export type AnEndpointBindingNamesItsDatabase = Assert<
  Equal<
    [DatabaseEndpointBinding['database'], DatabaseEndpointBinding['configuration']],
    [
      DatabaseReference,
      ContentAddress<'application/vnd.liteship.server-database-endpoint+cbor'>,
    ]
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
      DatabaseProvider['statement'] extends (
        request: StatementRequest<StatementId<'liteship.server.db.law.statement-a'>>,
      ) => Result<
        StatementResource<StatementId<'liteship.server.db.law.statement-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      DatabaseProvider['migration']['apply'],
      StatementRequest['deadline'],
      StatementResource['deadline'],
      StatementResource<StatementId<'liteship.server.db.law.statement-a'>>['cancel'],
      StatementResource['lifecycle'],
    ],
    [
      Signature<DatabaseReference, DatabasePool, NonEmptyTuple<Diagnostic>>,
      true,
      Signature<MigrationAddress, TransactionGeneration, NonEmptyTuple<Diagnostic>>,
      Deadline,
      Deadline,
      Signature<
        StatementReference<StatementId<'liteship.server.db.law.statement-a'>>,
        CancellationReceipt<StatementReference<StatementId<'liteship.server.db.law.statement-a'>>>,
        NonEmptyTuple<Diagnostic>
      >,
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
