/**
 * Compile-time laws for `01_hosts/edge`.
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

import type { GroundingId, RealizationOfferId } from '../../00_core/14_compiler/types.js';
import type { Assert, Equal } from '../../types.js';
import type { RealizationCatalog } from '../types.js';
import type { EdgeBootstrapTypeSurface } from './00_bootstrap/types.js';
import type { EdgeRequestId, EdgeRequestTypeSurface } from './01_request/types.js';
import type { EdgeEvidenceTypeSurface } from './02_evidence/types.js';
import type { EdgePolicyTypeSurface } from './03_policy/types.js';
import type { EdgeSettlementTypeSurface } from './04_settlement/types.js';
import type { EdgeNetworkAuthority, EdgeNetworkTypeSurface } from './05_network/types.js';
import type { CacheKey, EdgeCacheTypeSurface } from './06_cache/types.js';
import type { EdgeStorageTypeSurface } from './07_storage/types.js';
import type { EdgeExecutionHost, EdgeExecutionTypeSurface } from './08_execution/types.js';
import type { CommittedResponse, EdgeResponseTypeSurface } from './09_response/types.js';
import type { EdgeDeferredTypeSurface } from './10_deferred/types.js';
import type { EdgeCapabilityTopology, EdgeTypeAt, EdgeTypeTopology } from './types.js';


// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/** Compile-time law: the topology is ordered — position by position, exactly. */
export type TheEdgeTopologyIsOrderedExactly = Assert<
  Equal<
    [
      EdgeTypeTopology[0]['name'],
      EdgeTypeTopology[1]['name'],
      EdgeTypeTopology[2]['name'],
      EdgeTypeTopology[3]['name'],
      EdgeTypeTopology[4]['name'],
      EdgeTypeTopology[5]['name'],
      EdgeTypeTopology[6]['name'],
      EdgeTypeTopology[7]['name'],
      EdgeTypeTopology[8]['name'],
      EdgeTypeTopology[9]['name'],
      EdgeTypeTopology[10]['name'],
    ],
    [
      '00_bootstrap',
      '01_request',
      '02_evidence',
      '03_policy',
      '04_settlement',
      '05_network',
      '06_cache',
      '07_storage',
      '08_execution',
      '09_response',
      '10_deferred',
    ]
  >
>;


/** Compile-time law: every home resolves to its own surface. */
export type EachEdgeHomeResolvesToItsOwnSurface = Assert<
  Equal<
    [
      EdgeTypeAt<'00_bootstrap'>,
      EdgeTypeAt<'01_request'>,
      EdgeTypeAt<'02_evidence'>,
      EdgeTypeAt<'03_policy'>,
      EdgeTypeAt<'04_settlement'>,
      EdgeTypeAt<'05_network'>,
      EdgeTypeAt<'06_cache'>,
      EdgeTypeAt<'07_storage'>,
      EdgeTypeAt<'08_execution'>,
      EdgeTypeAt<'09_response'>,
      EdgeTypeAt<'10_deferred'>,
    ],
    [
      EdgeBootstrapTypeSurface,
      EdgeRequestTypeSurface,
      EdgeEvidenceTypeSurface,
      EdgePolicyTypeSurface,
      EdgeSettlementTypeSurface,
      EdgeNetworkTypeSurface,
      EdgeCacheTypeSurface,
      EdgeStorageTypeSurface,
      EdgeExecutionTypeSurface,
      EdgeResponseTypeSurface,
      EdgeDeferredTypeSurface,
    ]
  >
>;


/** Compile-time law: the grounding population is exact. */
export type TheEdgeGroundingPopulationIsExact = Assert<
  Equal<
    keyof EdgeCapabilityTopology['groundings'],
    | 'invocation'
    | 'deploymentConfiguration'
    | 'request'
    | 'hintSource'
    | 'responsePolicy'
    | 'networkFacility'
    | 'cacheFacility'
    | 'deploymentStore'
    | 'executionFacility'
    | 'responseFacility'
    | 'deferredFacility'
  >
>;


/** Compile-time law: the offer population is exact. */
export type TheEdgeOfferPopulationIsExact = Assert<
  Equal<
    keyof EdgeCapabilityTopology['offers'],
    | 'requestEvidence'
    | 'requestSettlement'
    | 'networkAuthority'
    | 'cacheAuthority'
    | 'store'
    | 'executionHost'
    | 'responseCommit'
    | 'deferredWork'
  >
>;


/** Compile-time law: the topology carries its erased catalog beside the typed rosters. */
export type TheEdgeTopologyCarriesItsErasedCatalog = Assert<
  Equal<EdgeCapabilityTopology['erased'], RealizationCatalog>
>;


/**
 * Compile-time law: every declaration pins its exact identity — all eleven
 * grounding slots and all eight offers, nineteen pinned capability
 * declarations, so no two edge declarations can collide or borrow another's
 * identity string.
 */
export type EveryEdgeDeclarationPinsItsExactIdentity = Assert<
  Equal<
    [
      EdgeCapabilityTopology['groundings']['invocation']['id'],
      EdgeCapabilityTopology['groundings']['deploymentConfiguration']['id'],
      EdgeCapabilityTopology['groundings']['request']['id'],
      EdgeCapabilityTopology['groundings']['hintSource']['id'],
      EdgeCapabilityTopology['groundings']['responsePolicy']['id'],
      EdgeCapabilityTopology['groundings']['networkFacility']['id'],
      EdgeCapabilityTopology['groundings']['cacheFacility']['id'],
      EdgeCapabilityTopology['groundings']['deploymentStore']['id'],
      EdgeCapabilityTopology['groundings']['executionFacility']['id'],
      EdgeCapabilityTopology['groundings']['responseFacility']['id'],
      EdgeCapabilityTopology['groundings']['deferredFacility']['id'],
      EdgeCapabilityTopology['offers']['requestEvidence']['id'],
      EdgeCapabilityTopology['offers']['requestSettlement']['id'],
      EdgeCapabilityTopology['offers']['networkAuthority']['id'],
      EdgeCapabilityTopology['offers']['cacheAuthority']['id'],
      EdgeCapabilityTopology['offers']['store']['id'],
      EdgeCapabilityTopology['offers']['executionHost']['id'],
      EdgeCapabilityTopology['offers']['responseCommit']['id'],
      EdgeCapabilityTopology['offers']['deferredWork']['id'],
    ],
    [
      GroundingId<'liteship.edge.grounding.invocation'>,
      GroundingId<'liteship.edge.grounding.deployment-configuration'>,
      GroundingId<'liteship.edge.grounding.request'>,
      GroundingId<'liteship.edge.grounding.hint-source'>,
      GroundingId<'liteship.edge.grounding.response-policy'>,
      GroundingId<'liteship.edge.grounding.network-facility'>,
      GroundingId<'liteship.edge.grounding.cache-facility'>,
      GroundingId<'liteship.edge.grounding.deployment-store'>,
      GroundingId<'liteship.edge.grounding.execution-facility'>,
      GroundingId<'liteship.edge.grounding.response-facility'>,
      GroundingId<'liteship.edge.grounding.deferred-facility'>,
      RealizationOfferId<'liteship.edge.offer.request-evidence'>,
      RealizationOfferId<'liteship.edge.offer.request-settlement'>,
      RealizationOfferId<'liteship.edge.offer.network-authority'>,
      RealizationOfferId<'liteship.edge.offer.cache-authority'>,
      RealizationOfferId<'liteship.edge.offer.store'>,
      RealizationOfferId<'liteship.edge.offer.execution-host'>,
      RealizationOfferId<'liteship.edge.offer.response-commit'>,
      RealizationOfferId<'liteship.edge.offer.deferred-work'>,
    ]
  >
>;


/**
 * Compile-time law: load-bearing surface members stay their declared types —
 * a surface cannot quietly blur its network authority, cache key, execution
 * host, or committed response to `unknown`.
 */
export type EdgeSurfacesCarryTheirDeclaredMembers = Assert<
  Equal<
    [
      EdgeTypeAt<'05_network'>['authority'],
      EdgeTypeAt<'06_cache'>['key'],
      EdgeTypeAt<'08_execution'>['host'],
      EdgeTypeAt<'09_response'>['committed'],
    ],
    [EdgeNetworkAuthority, CacheKey, EdgeExecutionHost, CommittedResponse<EdgeRequestId>]
  >
>;
