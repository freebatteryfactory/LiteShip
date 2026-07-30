/** Repository-script adapter over the production CLI feature-edge host. */

import { combineFeatureEdgeFamilies } from '../../packages/audit/src/catalog-feature-edge-census.js';
import type { FeatureEdgeFacts, FeatureEdgeFamilyFacts } from '../../packages/gauntlet/src/index.js';
import * as mcpOwners from '../../packages/mcp-server/src/index.js';
import {
  buildLiteShipFeatureEdgeFacts as buildProductionFeatureEdgeFacts,
  type McpFeatureEdgeOwners,
} from '../../packages/cli/src/internal/feature-edge-profile.js';

/** Build the exact live production pack from canonical owners. */
export function buildLiveLiteShipFeatureEdgeFacts(repoRoot: string): FeatureEdgeFacts {
  return buildProductionFeatureEdgeFacts(repoRoot, mcpOwners satisfies McpFeatureEdgeOwners);
}

/**
 * Retained-defect adapter: replace only the ECS family with the historical
 * overlay while every other family still comes from the production host path.
 */
export function buildLiteShipFeatureEdgeFacts(repoRoot: string, ecs: FeatureEdgeFamilyFacts): FeatureEdgeFacts {
  const live = buildLiveLiteShipFeatureEdgeFacts(repoRoot);
  return combineFeatureEdgeFamilies(live.families.map((family) => (family.family === 'ecs-component' ? ecs : family)));
}

/** Catalog-only projection retained for focused per-family mutation tests. */
export function buildLiteShipCatalogFeatureEdgeFamilies(repoRoot: string): readonly FeatureEdgeFamilyFacts[] {
  return buildLiveLiteShipFeatureEdgeFacts(repoRoot).families.filter((family) => family.family !== 'ecs-component');
}
