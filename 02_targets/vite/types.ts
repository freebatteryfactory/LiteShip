/**
 * The Vite target child: its home roster and the topology that reaches every
 * surface it owns.
 *
 * Six homes. As with its sibling, the umbrella carries no meaning of its own —
 * it exists so that a home declared but unreached is a compile error rather
 * than an oversight.
 *
 * This child imports nothing from any other target, and nothing here names a
 * requester. Whether the facility it exposes converges with anyone's
 * requirement is a question for a composition point that imports both; it is
 * not a question this child may answer about itself.
 *
 * @module
 */

import type { Assert, Equal } from '../../types.js';
import type { ViteIntegrationTypeSurface } from './00_integration/types.js';
import type { ViteProjectionTypeSurface } from './01_projection/types.js';
import type { ViteModuleTypeSurface } from './02_module/types.js';
import type { ViteGraphTypeSurface } from './03_graph/types.js';
import type { ViteAssetTypeSurface } from './04_asset/types.js';
import type { ViteBuildTypeSurface } from './05_build/types.js';

/** Every home this child owns, keyed by its source path. */
export interface ViteTopology {
  readonly '00_integration': ViteIntegrationTypeSurface;
  readonly '01_projection': ViteProjectionTypeSurface;
  readonly '02_module': ViteModuleTypeSurface;
  readonly '03_graph': ViteGraphTypeSurface;
  readonly '04_asset': ViteAssetTypeSurface;
  readonly '05_build': ViteBuildTypeSurface;
}

/** The surface at one home. */
export type ViteTypeAt<Home extends keyof ViteTopology> = ViteTopology[Home];

// ---------------------------------------------------------------------------
// Laws

/** Compile-time law: the roster is exactly these six homes. */
export type TheViteRosterIsExactlySixHomes = Assert<
  Equal<
    keyof ViteTopology,
    '00_integration' | '01_projection' | '02_module' | '03_graph' | '04_asset' | '05_build'
  >
>;

/** Compile-time law: load-bearing surface members keep their declared types. */
export type ViteSurfacesCarryTheirDeclaredMembers = Assert<
  Equal<
    [
      Equal<ViteTypeAt<'01_projection'>['facility'], ViteProjectionTypeSurface['facility']>,
      Equal<ViteTypeAt<'02_module'>['identity'], ViteModuleTypeSurface['identity']>,
      Equal<ViteTypeAt<'03_graph'>['update'], ViteGraphTypeSurface['update']>,
      Equal<ViteTypeAt<'04_asset'>['asset'], ViteAssetTypeSurface['asset']>,
      Equal<ViteTypeAt<'05_build'>['filled'], ViteBuildTypeSurface['filled']>,
    ],
    [true, true, true, true, true]
  >
>;

/** Compile-time law: this child declares no ecosystem-target identity of its own. */
export type TheViteChildDeclaresNoSecondTargetIdentity = Assert<
  Equal<'target' extends keyof ViteTopology ? true : false, false>
>;
