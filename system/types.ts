/**
 * LiteShip system type topology.
 *
 * `system/` is unnumbered because it is orthogonal to the product waterfall
 * rather than a rung on it. It observes and coordinates the repository; product
 * homes never depend on it in the other direction.
 *
 * This file names the homes that physically exist and records their order. It
 * does not re-export their declarations or become an implementation hub, for
 * the same reason `00_core/types.ts` does not.
 *
 * **The population here is five.** Workspace, assurance, release, programs,
 * and bootstrap all physically exist and every entry carries its own home's
 * surface. Programs and bootstrap waited for the wire contracts they consume;
 * now the topology names the complete authored population.
 *
 * A note on a word that is already taken: `00_core/08_state` owns
 * `SystemDefinition`, which is a system in the entity/component sense — a rule
 * that runs over a world. Nothing in this layer is related to it. The collision
 * is unfortunate and is not worth renaming either side, because both names are
 * correct in their own vocabulary and neither is ever imported by the other.
 *
 * @module
 */

import type {
  Named,
  Tuple,
} from '../types.js';
import type { WorkspaceTypeSurface } from './00_workspace/types.js';
import type { AssuranceTypeSurface } from './01_assurance/types.js';
import type { ReleaseTypeSurface } from './02_release/types.js';
import type { ProgramsTypeSurface } from './03_programs/types.js';
import type { BootstrapTypeSurface } from './04_bootstrap/types.js';

/**
 * The system homes that physically exist, in dependency order.
 *
 * Workspace observes the repository and depends on nothing else here.
 * Assurance consumes workspace snapshots. Release consumes a passing assurance
 * result. Programs are the operations that drive that chain, and bootstrap is
 * the contract the root executable satisfies in order to reach them.
 *
 * The order is the dependency, not a schedule. Programs and bootstrap were named
 * here long before they existed, and waited on exactly one thing: a program
 * projects through a wire, so its contract could not be written honestly before
 * `02_wires/cli` was.
 */
export interface SystemTypeHome<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/** Complete inspectable system type topology. */
export type SystemTypeTopology = Tuple<
  [
    SystemTypeHome<'00_workspace', WorkspaceTypeSurface>,
    SystemTypeHome<'01_assurance', AssuranceTypeSurface>,
    SystemTypeHome<'02_release', ReleaseTypeSurface>,
    SystemTypeHome<'03_programs', ProgramsTypeSurface>,
    SystemTypeHome<'04_bootstrap', BootstrapTypeSurface>,
  ]
>;

/**
 * The system homes that physically exist, in dependency order.
 *
 * Derived from the topology. It used to be a hand-written union beside the
 * tuple, guarded by a parity law — a confession that the population was written
 * twice, in a file authored the same day the repository deleted a folder for
 * exactly that habit.
 */
export type SystemHomeName = SystemTypeTopology[number]['name'];

/** Select one owner surface by its source-home name. */
export type SystemTypeAt<Name extends SystemHomeName> = Extract<
  SystemTypeTopology[number],
  { readonly name: Name }
>['Type'];
