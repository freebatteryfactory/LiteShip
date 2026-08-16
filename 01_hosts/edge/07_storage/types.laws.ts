/**
 * Compile-time laws for `01_hosts/edge/07_storage`.
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
import type { Assert, BindingsFor, Equal, NonEmptyTuple, Result, UniqueRequirements } from '../../../types.js';
import type { DeploymentStoreBinding, DeploymentStoreRequirement, EdgeStore, EdgeStoreRow } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That provider semantics agree with the selected upstream ports at runtime
// is `system/assurance`; batching is empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: construction returns exact bindings for the exact unique row. */
export type EdgeConstructionReturnsExactBindings = Assert<
  Equal<
    EdgeStore['construct'],
    <Row extends EdgeStoreRow>(
      row: UniqueRequirements<Row>,
    ) => Result<BindingsFor<Row>, NonEmptyTuple<Diagnostic>>
  >
>;

/** Compile-time law: deployment supplies one exact addressed storage binding. */
export type TheStoreBindingIsAddressedNotAMarker = Assert<
  Equal<
    DeploymentStoreBinding['binding'],
    ContentAddress<'application/vnd.liteship.edge-deployment-store+cbor'>
  >
>;


/** Compile-time law: a foreign hole is not a store port — the union is closed. */
export type TheStorePortUnionIsClosed = Assert<
  Equal<readonly [DeploymentStoreRequirement] extends EdgeStoreRow ? true : false, false>
>;
