/**
 * Compile-time laws for `01_hosts/web/07_persistence`.
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
import type { RevisionStoreRequirement, SnapshotStoreRequirement } from '../../../00_core/08_state/types.js';
import type { Assert, BindingsFor, Equal, Hole, NonEmptyTuple, OutputOf, Result, UniqueRequirements } from '../../../types.js';
import type { BrowserDatabase, BrowserStoreRow, DatabaseFacility, DatabaseFacilityRequirement, WebStoreOffer } from './types.js';

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
