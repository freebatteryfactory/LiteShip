/**
 * Edge: the constrained request-time realm's semantic topology.
 *
 * Eleven numbered homes in dependency order, one inspectable capability
 * composition, and the exact identity gate over every declared grounding and
 * offer. Edge owns request admission, request evidence, policy, request-time
 * settlement, outbound network, cache, deployment storage, request-scoped
 * execution, response commitment, and bounded deferred work. It owns no DOM,
 * no worker semantics, no server facilities, and no vendor binding names.
 *
 * @module
 */

import type {
  Named,
  Tuple,
} from '../../types.js';

import type { RealizationCatalog } from '../types.js';
import type {
  EdgeBootstrapTypeSurface,
  EdgeDeploymentGrounding,
  EdgeInvocationGrounding,
} from './00_bootstrap/types.js';
import type {
  EdgeRequestTypeSurface,
  RequestGrounding,
} from './01_request/types.js';
import type {
  EdgeEvidenceTypeSurface,
  HintSourceGrounding,
  RequestEvidenceOffer,
} from './02_evidence/types.js';
import type { EdgePolicyGrounding, EdgePolicyTypeSurface } from './03_policy/types.js';
import type { EdgeSettlementTypeSurface, RequestSettlementOffer } from './04_settlement/types.js';
import type {
  EdgeNetworkFacilityGrounding,
  EdgeNetworkOffer,
  EdgeNetworkTypeSurface,
} from './05_network/types.js';
import type {
  CacheFacilityGrounding,
  EdgeCacheOffer,
  EdgeCacheTypeSurface,
} from './06_cache/types.js';
import type {
  DeploymentStoreGrounding,
  EdgeStorageTypeSurface,
  EdgeStoreOffer,
} from './07_storage/types.js';
import type {
  EdgeExecutionFacilityGrounding,
  EdgeExecutionOffer,
  EdgeExecutionTypeSurface,
} from './08_execution/types.js';
import type {
  EdgeResponseTypeSurface,
  ResponseCommitOffer,
  ResponseFacilityGrounding,
} from './09_response/types.js';
import type {
  DeferredFacilityGrounding,
  DeferredWorkOffer,
  EdgeDeferredTypeSurface,
} from './10_deferred/types.js';

/** One owner and the semantic surface its local `types.ts` declares. */
export interface EdgeTypeHome<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/** Complete ordered edge type waterfall. */
export type EdgeTypeTopology = Tuple<[
  EdgeTypeHome<'00_bootstrap', EdgeBootstrapTypeSurface>,
  EdgeTypeHome<'01_request', EdgeRequestTypeSurface>,
  EdgeTypeHome<'02_evidence', EdgeEvidenceTypeSurface>,
  EdgeTypeHome<'03_policy', EdgePolicyTypeSurface>,
  EdgeTypeHome<'04_settlement', EdgeSettlementTypeSurface>,
  EdgeTypeHome<'05_network', EdgeNetworkTypeSurface>,
  EdgeTypeHome<'06_cache', EdgeCacheTypeSurface>,
  EdgeTypeHome<'07_storage', EdgeStorageTypeSurface>,
  EdgeTypeHome<'08_execution', EdgeExecutionTypeSurface>,
  EdgeTypeHome<'09_response', EdgeResponseTypeSurface>,
  EdgeTypeHome<'10_deferred', EdgeDeferredTypeSurface>
]>;

/**
 * Stable source-home names in numbered dependency order.
 *
 * Derived from the topology. A hand-written union beside a hand-written tuple
 * is one population twice, and the law that compared them was a confession
 * rather than a proof.
 */
export type EdgeHomeName = EdgeTypeTopology[number]['name'];

/** Select one owner surface by its source-home name. */
export type EdgeTypeAt<Name extends EdgeHomeName> = Extract<
  EdgeTypeTopology[number],
  { readonly name: Name }
>['Type'];

/**
 * The inspectable edge capability composition: every declared grounding slot
 * and every declared offer, by owning home, plus the erased catalog.
 */
export interface EdgeCapabilityTopology {
  readonly groundings: {
    readonly invocation: EdgeInvocationGrounding;
    readonly deploymentConfiguration: EdgeDeploymentGrounding;
    readonly request: RequestGrounding;
    readonly hintSource: HintSourceGrounding;
    readonly responsePolicy: EdgePolicyGrounding;
    readonly networkFacility: EdgeNetworkFacilityGrounding;
    readonly cacheFacility: CacheFacilityGrounding;
    readonly deploymentStore: DeploymentStoreGrounding;
    readonly executionFacility: EdgeExecutionFacilityGrounding;
    readonly responseFacility: ResponseFacilityGrounding;
    readonly deferredFacility: DeferredFacilityGrounding;
  };
  readonly offers: {
    readonly requestEvidence: RequestEvidenceOffer;
    readonly requestSettlement: RequestSettlementOffer;
    readonly networkAuthority: EdgeNetworkOffer;
    readonly cacheAuthority: EdgeCacheOffer;
    readonly store: EdgeStoreOffer;
    readonly executionHost: EdgeExecutionOffer;
    readonly responseCommit: ResponseCommitOffer;
    readonly deferredWork: DeferredWorkOffer;
  };
  readonly erased: RealizationCatalog;
}
