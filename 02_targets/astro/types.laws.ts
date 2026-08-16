/**
 * Compile-time laws for `02_targets/astro`.
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
import type { AstroAuthoringTypeSurface } from './02_authoring/types.js';
import type { AstroBuildTypeSurface } from './03_build/types.js';
import type { AstroIslandTypeSurface } from './04_island/types.js';
import type { AstroServerTypeSurface } from './05_server/types.js';
import type { AstroTopology, AstroTypeAt } from './types.js';

// ---------------------------------------------------------------------------
// Laws

/**
 * Compile-time law: the roster is exactly these seven homes.
 *
 * A home added on disk without being reached here, or a home removed here while
 * its files remain, breaks this. The roster cannot drift from the tree silently.
 */
export type TheRosterIsExactlySevenHomes = Assert<
  Equal<
    keyof AstroTopology,
    | '00_integration'
    | '01_configuration'
    | '02_authoring'
    | '03_build'
    | '04_island'
    | '05_server'
    | '06_development'
  >
>;


/**
 * Compile-time law: load-bearing surface members keep their declared types.
 *
 * A whole-surface comparison stays green while an individual member blurs to
 * `unknown`, so the members that carry this child's actual claims are named
 * one by one.
 */
export type AstroSurfacesCarryTheirDeclaredMembers = Assert<
  Equal<
    [
      Equal<AstroTypeAt<'03_build'>['facility'], AstroBuildTypeSurface['facility']>,
      Equal<AstroTypeAt<'02_authoring'>['activation'], AstroAuthoringTypeSurface['activation']>,
      Equal<AstroTypeAt<'05_server'>['mount'], AstroServerTypeSurface['mount']>,
      Equal<AstroTypeAt<'04_island'>['entry'], AstroIslandTypeSurface['entry']>,
    ],
    [true, true, true, true]
  >
>;


/**
 * Compile-time law: this child declares no ecosystem-target identity of its own.
 *
 * Its identity is the umbrella's, instantiated. A second brand here would make
 * "the Astro target" two types that agree only while someone keeps checking.
 */
export type TheChildDeclaresNoSecondTargetIdentity = Assert<
  Equal<'target' extends keyof AstroTopology ? true : false, false>
>;
