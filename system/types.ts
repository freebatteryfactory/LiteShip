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
 * **The population here is three, and three is not the end.** `03_programs`
 * and `04_bootstrap` are settled responsibilities with no folder yet, because
 * both consume wire contracts and `02_wires/` does not exist. Naming them in
 * this topology before they exist would produce exactly the inventory nothing
 * can verify that `01_hosts` refused for as long as only one host was real. The
 * README states what is coming; the type states what is here.
 *
 * A note on a word that is already taken: `00_core/08_state` owns
 * `SystemDefinition`, which is a system in the entity/component sense — a rule
 * that runs over a world. Nothing in this layer is related to it. The collision
 * is unfortunate and is not worth renaming either side, because both names are
 * correct in their own vocabulary and neither is ever imported by the other.
 *
 * @module
 */

import type { Named, Tuple, WithoutOrdinalPrefix } from '../types.js';
import type { WorkspaceTypeSurface } from './00_workspace/types.js';
import type { AssuranceTypeSurface } from './01_assurance/types.js';
import type { ReleaseTypeSurface } from './02_release/types.js';

/**
 * The system homes that physically exist, in dependency order.
 *
 * Workspace observes the repository and depends on nothing else here.
 * Assurance consumes workspace snapshots. Release consumes assurance authority.
 * The order is the dependency, not a schedule.
 */
export interface SystemTypeHome<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/** Complete inspectable system type topology. */
export type SystemTypeTopology = Tuple<[
  SystemTypeHome<'00_workspace', WorkspaceTypeSurface>,
  SystemTypeHome<'01_assurance', AssuranceTypeSurface>,
  SystemTypeHome<'02_release', ReleaseTypeSurface>
]>;

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

/** Name-indexed view used by assurance and agents, not by owner implementations. */
export type SystemTypeSurface = {
  readonly [Home in SystemTypeTopology[number] as WithoutOrdinalPrefix<Home['name']>]: Home['Type'];
};

