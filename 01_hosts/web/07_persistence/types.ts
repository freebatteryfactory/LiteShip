/**
 * Browser persistence offers over the four core store ports.
 *
 * Core owns `RevisionStore`, `SnapshotStore`, `ChangeLog`, and `BlobStore`,
 * and already declares their canonical requirement holes. Web may realize any
 * exact subset through a browser database — including one atomic provider
 * where one transaction domain genuinely backs several — but none of the four
 * is mandatory, and island correctness is never architecturally coupled to
 * durable browser storage. This home is provisional physical realization:
 * lawful and valuable, but not a ledger-proven port.
 *
 * Local-first and CRDT behavior remain research and do not live here.
 *
 * @module
 */

import type {
  Assert,
  BindingsFor,
  UniqueRequirements,
  Brand,
  Equal,
  Hole,
  NonEmptyTuple,
  OutputOf,
  Result,
  Signature,
} from '../../../types.js';
import type { GroundingId, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  BlobStoreRequirement,
  ChangeLogRequirement,
  RevisionStoreRequirement,
  SnapshotStoreRequirement,
} from '../../../00_core/08_state/types.js';
import type { OwnedResource } from '../../../00_core/05_lifecycle/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';

export type BrowserDatabaseName = Brand<string, 'liteship.web.database-name'>;

/**
 * A live browser database: an owned lifetime that is also a real authority —
 * it constructs *exact* bindings for the requested row, in order, with the
 * requested contracts. A loose union array would let a request for revision
 * and snapshot stores be satisfied by two blob-store bindings; `BindingsFor`
 * makes that unrepresentable. An `OwnedResource` alone is a lifetime, not a
 * database.
 */
export interface BrowserDatabase extends OwnedResource {
  readonly name: BrowserDatabaseName;
  readonly construct: <Row extends BrowserStoreRow>(
    row: UniqueRequirements<Row>,
  ) => Result<BindingsFor<Row>, NonEmptyTuple<Diagnostic>>;
}

/** Narrow intrinsic authority over the browser database factory. Opening is construction. */
export interface DatabaseFacility {
  readonly open: Signature<BrowserDatabaseName, BrowserDatabase, NonEmptyTuple<Diagnostic>>;
}

export type DatabaseFacilityRequirement = Hole<'liteship.web.database-facility', DatabaseFacility>;

/** Intrinsic grounding: the database factory facility. */
export interface DatabaseFacilityGrounding
  extends WebGroundingDefinition<readonly [DatabaseFacilityRequirement], unknown, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.database-facility'>;
}

/**
 * The owner-imported holes a browser store provider may fill. Exactly these
 * four: a hole outside this union is not a store port, and a store port never
 * gets a locally authored twin.
 */
export type BrowserStoreRequirement =
  | RevisionStoreRequirement
  | SnapshotStoreRequirement
  | ChangeLogRequirement
  | BlobStoreRequirement;

/** A non-empty exact subset of the store ports, provided atomically or singly. */
export type BrowserStoreRow = readonly [BrowserStoreRequirement, ...BrowserStoreRequirement[]];

/**
 * A web persistence offer: provides an exact subset of the four ports and
 * requires the database facility to construct its provider. The umbrella
 * machinery already enforces non-empty unique rows, sealed failure, and one
 * provider lifecycle counted and disposed once.
 */
export interface WebStoreOffer<Provides extends BrowserStoreRow = BrowserStoreRow>
  extends WebRealizationOffer<
    Provides,
    readonly [DatabaseFacilityRequirement],
    BrowserDatabaseName,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.store'>;
  readonly locations: NonEmptyTuple<'local'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// Which ports a deployment actually selects, and whether one database honestly
// backs several atomically, are planning facts settled by residual demand and
// verified by assurance — not declared here.
// ---------------------------------------------------------------------------

type ExampleForeignHole = Hole<'liteship.example.not-a-store', { readonly poke: () => void }>;

/** Compile-time law: a store row cannot smuggle a hole that is not a store port. */
export type AStoreRowRefusesAForeignHole = Assert<
  Equal<readonly [ExampleForeignHole] extends BrowserStoreRow ? true : false, false>
>;

/** Compile-time law: an atomic provider declares the exact subset it provides. */
export type AnAtomicProviderDeclaresItsExactSubset = Assert<
  Equal<
    WebStoreOffer<readonly [RevisionStoreRequirement, SnapshotStoreRequirement]>['provides'],
    readonly [RevisionStoreRequirement, SnapshotStoreRequirement]
  >
>;

/** Compile-time law: a store provider is constructed from the database facility. */
export type AStoreProviderRequiresTheFacility = Assert<
  Equal<WebStoreOffer['requires'], readonly [DatabaseFacilityRequirement]>
>;

/**
 * Compile-time law: opening yields a database authority whose construction
 * returns exact ordered bindings for the requested row — never a loose union
 * array a wrong subset could satisfy.
 */
export type ConstructionReturnsExactBindings = Assert<
  Equal<
    [
      OutputOf<DatabaseFacility['open']>,
      Equal<
        BrowserDatabase['construct'],
        <Row extends BrowserStoreRow>(
          row: UniqueRequirements<Row>,
        ) => Result<BindingsFor<Row>, NonEmptyTuple<Diagnostic>>
      >,
    ],
    [BrowserDatabase, true]
  >
>;

/** Type summary consumed by the web topology. */
export interface WebPersistenceTypeSurface {
  readonly database: BrowserDatabaseName;
  readonly row: BrowserStoreRow;
  readonly facility: DatabaseFacilityGrounding;
  readonly offer: WebStoreOffer;
}
