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

import type { Assert, Equal, Named, Tuple } from '../types.js';
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
export type SystemHomeName = '00_workspace' | '01_assurance' | '02_release';

/** One owner and the semantic surface its local `types.ts` declares. */
export interface SystemTypeHome<Name extends SystemHomeName, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/** Complete inspectable system type topology. */
export type SystemTypeTopology = Tuple<[
  SystemTypeHome<'00_workspace', WorkspaceTypeSurface>,
  SystemTypeHome<'01_assurance', AssuranceTypeSurface>,
  SystemTypeHome<'02_release', ReleaseTypeSurface>
]>;

/** Select one owner surface by its source-home name. */
export type SystemTypeAt<Name extends SystemHomeName> = Extract<
  SystemTypeTopology[number],
  { readonly name: Name }
>['Type'];

/** Name-indexed view used by assurance and agents, not by owner implementations. */
export interface SystemTypeSurface {
  readonly workspace: WorkspaceTypeSurface;
  readonly assurance: AssuranceTypeSurface;
  readonly release: ReleaseTypeSurface;
}

/**
 * The topology and the home-name union are one population.
 *
 * Without this, the union and the tuple drift: a home added to one and not the
 * other compiles perfectly and leaves `SystemTypeAt` silently unable to select
 * it. The last line is the anti-vacuity partner — `Extract` over a name that
 * belongs to no entry yields `never`, so a lookup that resolves to `never`
 * proves the two sides disagree.
 */
export type TheSystemTopologyMatchesItsHomeNames = Assert<
  Equal<
    [
      Equal<SystemTypeTopology[number]['name'], SystemHomeName>,
      Equal<SystemTypeTopology['length'], 3>,
      [SystemTypeAt<'00_workspace'>] extends [never] ? true : false,
      [SystemTypeAt<'01_assurance'>] extends [never] ? true : false,
      [SystemTypeAt<'02_release'>] extends [never] ? true : false,
    ],
    [true, true, false, false, false]
  >
>;
