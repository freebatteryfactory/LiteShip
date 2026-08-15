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
  BindingsFor,
  Brand,
  Hole,
  NonEmptyTuple,
  Result,
  Signature,
  UniqueRequirements,
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
  extends WebGroundingDefinition<readonly [DatabaseFacilityRequirement], DatabaseFacility, 'intrinsic', 'unowned'> {
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

/** Type summary consumed by the web topology. */
export interface WebPersistenceTypeSurface {
  readonly database: BrowserDatabaseName;
  readonly row: BrowserStoreRow;
  readonly facility: DatabaseFacilityGrounding;
  readonly offer: WebStoreOffer;
}
