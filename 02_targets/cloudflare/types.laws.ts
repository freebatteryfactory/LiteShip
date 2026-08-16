/**
 * Compile-time laws for `02_targets/cloudflare`.
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
import type { CloudflareConfigurationTypeSurface } from './01_configuration/types.js';
import type { CloudflareBindingTypeSurface } from './02_binding/types.js';
import type { CloudflareDeploymentTypeSurface } from './03_deployment/types.js';
import type { CloudflareTopology, CloudflareTypeAt } from './types.js';

// ---------------------------------------------------------------------------
// Laws

/** Compile-time law: the roster is exactly these four homes. */
export type TheCloudflareRosterIsExactlyFourHomes = Assert<
  Equal<
    keyof CloudflareTopology,
    '00_integration' | '01_configuration' | '02_binding' | '03_deployment'
  >
>;

/** Compile-time law: load-bearing surface members keep their declared types. */
export type CloudflareSurfacesCarryTheirDeclaredMembers = Assert<
  Equal<
    [
      Equal<CloudflareTypeAt<'03_deployment'>['request'], CloudflareDeploymentTypeSurface['request']>,
      Equal<CloudflareTypeAt<'02_binding'>['binding'], CloudflareBindingTypeSurface['binding']>,
      Equal<CloudflareTypeAt<'01_configuration'>['admitted'], CloudflareConfigurationTypeSurface['admitted']>,
    ],
    [true, true, true]
  >
>;
