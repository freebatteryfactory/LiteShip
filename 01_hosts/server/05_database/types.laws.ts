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
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { Deadline } from '../../../00_core/05_lifecycle/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, BindingsFor, CaseOf, Equal, InputOf, NonEmptyTuple, Result, Signature, UniqueRequirements } from '../../../types.js';
import type { SecretProviderRequirement } from '../02_secret/types.js';
import type { DatabaseConnection, DatabaseEndpointRequirement, DatabasePool, DatabaseProvider, DatabaseProviderOffer, DatabaseReference, MigrationAddress, ServerStoreRow, StatementRequest, StatementResource, TransactionLease, TransactionLeaseRequest } from './types.js';

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
