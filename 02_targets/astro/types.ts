/**
 * The Astro target child: its home roster and the topology that reaches every
 * surface it owns.
 *
 * A child umbrella carries no meaning of its own. Its job is to make the roster
 * checkable: a home whose families are declared but reached by nothing is
 * correct and unreached, which the completion standard treats as incomplete.
 * The umbrella is where that becomes a compile error instead of an oversight.
 *
 * Seven homes, each earning its place by owning a distinct translation
 * relationship rather than by mirroring an ecosystem feature. There is no
 * artifact home: the home that causes a production owns it — build artifacts
 * with build, island entries with islands, generated declarations with
 * development. A generic artifact home would become a waiting room for
 * unrelated emitted things and would tempt this child to restate core artifact
 * fields.
 *
 * @module
 */

import type { AstroIntegrationTypeSurface } from './00_integration/types.js';
import type { AstroConfigurationTypeSurface } from './01_configuration/types.js';
import type { AstroAuthoringTypeSurface } from './02_authoring/types.js';
import type { AstroBuildTypeSurface } from './03_build/types.js';
import type { AstroIslandTypeSurface } from './04_island/types.js';
import type { AstroServerTypeSurface } from './05_server/types.js';
import type { AstroDevelopmentTypeSurface } from './06_development/types.js';

/** Every home this child owns, keyed by its source path. */
export interface AstroTopology {
  readonly '00_integration': AstroIntegrationTypeSurface;
  readonly '01_configuration': AstroConfigurationTypeSurface;
  readonly '02_authoring': AstroAuthoringTypeSurface;
  readonly '03_build': AstroBuildTypeSurface;
  readonly '04_island': AstroIslandTypeSurface;
  readonly '05_server': AstroServerTypeSurface;
  readonly '06_development': AstroDevelopmentTypeSurface;
}

/** The surface at one home. */
export type AstroTypeAt<Home extends keyof AstroTopology> = AstroTopology[Home];
