/**
 * Edge storage: deployment-bound providers realizing exact core ports.
 *
 * This home owns optional edge-physical providers that realize lawful
 * subsets of core revision, snapshot, change-log, and blob ports through
 * deployment bindings. Vendor APIs remain target-specific; several bound
 * ports may share one provider lifecycle; the returned binding row is exact
 * — duplicate requests are uncallable, not accepted-then-never.
 *
 * @module
 */

import type {
  BindingsFor,
  Hole,
  NonEmptyTuple,
  Result,
  UniqueRequirements,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type {
  BlobStoreRequirement,
  ChangeLogRequirement,
  RevisionStoreRequirement,
  SnapshotStoreRequirement,
} from '../../../00_core/08_state/types.js';
import type { GroundingId, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { EdgeGroundingDefinition, EdgeRealizationOffer } from '../00_bootstrap/types.js';

/**
 * The owner-imported holes an edge store provider may fill. Exactly these
 * four core ports: a hole outside this union is not a store port, and a
 * store port never gets a locally authored twin.
 */
export type EdgeStorePortRequirement =
  | RevisionStoreRequirement
  | SnapshotStoreRequirement
  | ChangeLogRequirement
  | BlobStoreRequirement;

/** A non-empty exact subset of the store ports, provided atomically or singly. */
export type EdgeStoreRow = readonly [EdgeStorePortRequirement, ...EdgeStorePortRequirement[]];

/**
 * The deployment-bound store: construction takes a unique row of core ports
 * and returns the exact bindings for that row. One physical provider may
 * back several ports while sharing one lifecycle.
 */
export interface EdgeStore {
  readonly construct: <Row extends EdgeStoreRow>(
    row: UniqueRequirements<Row>,
  ) => Result<BindingsFor<Row>, NonEmptyTuple<Diagnostic>>;
}

/** The admitted deployment binding beneath the store. */
export interface DeploymentStoreBinding {
  readonly binding: ContentAddress<'application/vnd.liteship.edge-deployment-store+cbor'>;
}

/** Capability requirement for deployment store. */
export type DeploymentStoreRequirement = Hole<
  'liteship.edge.deployment-store',
  DeploymentStoreBinding
>;
/** Capability requirement for edge store. */
export type EdgeStoreRequirement = Hole<'liteship.edge.store', EdgeStore>;

/** Deployment grounding: the storage binding enters admitted from deployment. */
export interface DeploymentStoreGrounding
  extends EdgeGroundingDefinition<
    readonly [DeploymentStoreRequirement],
    DeploymentStoreBinding,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.deployment-store'>;
}

/** Constructing the edge store over its deployment binding. */
export interface EdgeStoreOffer
  extends EdgeRealizationOffer<
    readonly [EdgeStoreRequirement],
    readonly [DeploymentStoreRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.edge.offer.store'>;
  readonly locations: NonEmptyTuple<'request'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the edge topology. */
export interface EdgeStorageTypeSurface {
  readonly store: EdgeStore;
  readonly storeGrounding: DeploymentStoreGrounding;
  readonly storeOffer: EdgeStoreOffer;
}
