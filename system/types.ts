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
 * both consume wire contracts and only `02_wires/direct/` is written so far.
 * Naming them in
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

import type { Assert, Equal, IsExactlyTrue, Named, Tuple } from '../types.js';
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


// ---------------------------------------------------------------------------
// Law
// ---------------------------------------------------------------------------

/**
 * Compile-time law: every entry names its own home's surface.
 *
 * This file had zero assertions, and the README explained at length why zero was
 * the right number: the name union is derived from the tuple, so a parity law
 * would check a derivation against itself, and a topology whose only job is to
 * derive one population from one tuple has nothing left to be locally wrong
 * about.
 *
 * That was an untested claim about a file full of tested ones, and a canary
 * falsified it while `03_programs` and `04_bootstrap` were being added. Wiring
 * `03_programs` to `BootstrapTypeSurface` compiled. The only thing that noticed
 * was `noUnusedLocals`, complaining about an import nobody read.
 *
 * The derivation was never the exposed part. `SystemHomeName` cannot disagree
 * with the tuple — that much was right. What can disagree is an entry with the
 * wrong surface in it, and that is the likelier defect by far: a home is deleted
 * deliberately and loudly, while an entry is copy-pasted and edited in one of its
 * two positions, quietly, while adding the next one. The wire topology had the
 * identical gap, found the identical way, one commit earlier.
 *
 * The right-hand side is written independently of the topology, so this compares
 * rather than restates. The last line pins the population, so a home added here
 * and nowhere else fails rather than passing unexamined.
 */
export type EachEntryNamesItsOwnHomesSurface = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<SystemTypeAt<'00_workspace'>, WorkspaceTypeSurface>,
        Equal<SystemTypeAt<'01_assurance'>, AssuranceTypeSurface>,
        Equal<SystemTypeAt<'02_release'>, ReleaseTypeSurface>,
        Equal<SystemTypeAt<'03_programs'>, ProgramsTypeSurface>,
        Equal<SystemTypeAt<'04_bootstrap'>, BootstrapTypeSurface>,
        Equal<
          SystemHomeName,
          '00_workspace' | '01_assurance' | '02_release' | '03_programs' | '04_bootstrap'
        >,
      ],
      [true, true, true, true, true, true]
    >
  >
>;
