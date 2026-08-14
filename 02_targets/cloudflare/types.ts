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
