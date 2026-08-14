/**
 * Compile-time laws for `02_targets/vite`.
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

import type { Assert, Equal } from '../../types.js';
import type { ViteProjectionTypeSurface } from './01_projection/types.js';
import type { ViteModuleTypeSurface } from './02_module/types.js';
import type { ViteGraphTypeSurface } from './03_graph/types.js';
import type { ViteAssetTypeSurface } from './04_asset/types.js';
import type { ViteBuildTypeSurface } from './05_build/types.js';
import type { ViteTopology, ViteTypeAt } from './types.js';

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
