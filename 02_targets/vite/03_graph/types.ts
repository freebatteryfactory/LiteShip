/**
 * Environment-scoped module-graph relationships: invalidation, hot-update
 * ordering, and stale rejection.
 *
 * A content-addressed predecessor link without a monotonic generation allows
 * out-of-order updates to apply under arrival order. Vite's hot-update
 * timestamp is cache-busting evidence; neither the HMR guide nor hook contract
 * promises ordering.
 *
 * So the ecosystem timestamp stays what it is — evidence — and ordering is
 * carried by core's `StreamSequence`, which exists precisely to be monotonic.
 * An update that cannot be placed in that order is rejected as stale rather
 * than applied hopefully.
 *
 * Graphs are per environment. Collapsing them means an update computed for one
 * environment can invalidate a module in another.
 *
 * @module
 */

import type {
  Algebra,
  NonEmptyTuple,
} from '../../../types.js';
import type { RevisionId, RevisionReference } from '../../../00_core/02_identity/types.js';
import type { StreamSequence } from '../../../00_core/04_time/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  TargetConfigurationId,
  TargetConfigurationRevision,
} from '../../types.js';
import type { BuildEnvironmentName } from '../00_integration/types.js';
import type { GeneratedModuleIdentity } from '../02_module/types.js';

/**
 * One hot update, committed to everything needed to place and apply it.
 *
 * Every member is load-bearing. Without the source revision an update cannot be
 * matched to what changed; without the configuration revision it cannot be
 * matched to which build it belongs to; without the environment it can cross
 * graphs; without the sequence it cannot be ordered.
 */
export interface HotUpdate<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly module: GeneratedModuleIdentity<Config, Revision>;
  readonly source: RevisionReference<Revision>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly environment: BuildEnvironmentName;
  readonly sequence: StreamSequence;
}

/**
 * What happened to an offered update.
 *
 * `stale` is a first-class result carrying the sequence that beat it. An
 * out-of-order update that simply applied would leave the graph holding older
 * bytes than it already had, with nothing recording that it happened.
 */
export type HotUpdateDisposition<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  applied: { readonly update: HotUpdate<Config, Revision> };
  stale: {
    readonly offered: StreamSequence;
    readonly current: StreamSequence;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  rejected: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The families this home owns, so none is correct and unreached. */
export interface ViteGraphTypeSurface {
  readonly update: HotUpdate;
  readonly disposition: HotUpdateDisposition;
}
