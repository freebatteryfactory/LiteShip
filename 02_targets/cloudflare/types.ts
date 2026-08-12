/**
 * The Cloudflare target child: its home roster and the topology that reaches
 * every surface it owns.
 *
 * Four homes. Fewer than its siblings because this child does less: it does not
 * author, does not compile, and does not emit. It admits configuration,
 * declares which platform groundings a program needs, and consumes a deployable
 * application whoever produced it.
 *
 * @module
 */

import type { Assert, Equal } from '../../types.js';
import type { CloudflareIntegrationTypeSurface } from './00_integration/types.js';
import type { CloudflareConfigurationTypeSurface } from './01_configuration/types.js';
import type { CloudflareBindingTypeSurface } from './02_binding/types.js';
import type { CloudflareDeploymentTypeSurface } from './03_deployment/types.js';

/** Every home this child owns, keyed by its source path. */
export interface CloudflareTopology {
  readonly '00_integration': CloudflareIntegrationTypeSurface;
  readonly '01_configuration': CloudflareConfigurationTypeSurface;
  readonly '02_binding': CloudflareBindingTypeSurface;
  readonly '03_deployment': CloudflareDeploymentTypeSurface;
}

/** The surface at one home. */
export type CloudflareTypeAt<Home extends keyof CloudflareTopology> = CloudflareTopology[Home];

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

/** Compile-time law: this child declares no second ecosystem-target identity. */
export type TheCloudflareChildDeclaresNoSecondTargetIdentity = Assert<
  Equal<'target' extends keyof CloudflareTopology ? true : false, false>
>;
