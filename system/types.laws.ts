/**
 * Compile-time laws for `system`.
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

import type { Assert, Equal, IsExactlyTrue } from '../types.js';
import type { WorkspaceTypeSurface } from './00_workspace/types.js';
import type { AssuranceTypeSurface } from './01_assurance/types.js';
import type { ReleaseTypeSurface } from './02_release/types.js';
import type { ProgramsTypeSurface } from './03_programs/types.js';
import type { BootstrapTypeSurface } from './04_bootstrap/types.js';
import type { SystemHomeName, SystemTypeAt } from './types.js';

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
