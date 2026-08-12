/**
 * Environment-scoped module-graph relationships: invalidation, hot-update
 * ordering, and stale rejection.
 *
 * The predecessor's hot updates carried a content-address predecessor link but
 * no monotonic generation, so two updates arriving out of order both applied
 * and the later state was whichever landed last. The ecosystem does not fix
 * this: Vite's hot-update payload carries a timestamp for cache-busting, and
 * neither the HMR guide nor the hook documentation promises ordering.
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
  Assert,
  CaseOf,
  Equal,
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

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'vite.build'>;
type LawRevision = RevisionId;

/**
 * Compile-time law: an update carries core's ordering coordinate.
 *
 * Written against the imported `StreamSequence`. A local monotonic counter
 * would be structurally a `bigint` brand and would fail this, which is the only
 * way provenance can be asserted in a type.
 */
export type AnUpdateCarriesTheCoreSequence = Assert<
  Equal<HotUpdate['sequence'], StreamSequence>
>;

/** Compile-time law: an update commits to source revision, configuration, and environment. */
export type AnUpdateCommitsToItsAxes = Assert<
  Equal<
    [
      Equal<HotUpdate<LawConfig, LawRevision>['source'], RevisionReference<LawRevision>>,
      Equal<
        HotUpdate<LawConfig, LawRevision>['configuration'],
        TargetConfigurationRevision<LawConfig, LawRevision>
      >,
      Equal<HotUpdate['environment'], BuildEnvironmentName>,
    ],
    [true, true, true]
  >
>;

/**
 * Compile-time law: a stale update is rejected and says what beat it.
 *
 * Both sequences are carried, so the rejection is explicable rather than a bare
 * refusal, and `stale` carries no update — it cannot be mistaken for applying.
 */
export type AStaleUpdateIsRejectedAndExplained = Assert<
  Equal<
    [
      Equal<HotUpdateDisposition['_tag'], 'applied' | 'stale' | 'rejected'>,
      'update' extends keyof CaseOf<HotUpdateDisposition, 'stale'> ? true : false,
      Equal<CaseOf<HotUpdateDisposition, 'stale'>['offered'], StreamSequence>,
      Equal<CaseOf<HotUpdateDisposition, 'stale'>['current'], StreamSequence>,
    ],
    [true, false, true, true]
  >
>;

/**
 * Compile-time law: the ecosystem timestamp is not the ordering coordinate.
 *
 * Vite's payload timestamp is cache-busting evidence. Promoting it to semantic
 * ordering would adopt a guarantee the ecosystem does not make.
 */
export type TheEcosystemTimestampIsNotTheOrder = Assert<
  Equal<
    [
      'timestamp' extends keyof HotUpdate ? true : false,
      'time' extends keyof HotUpdate ? true : false,
    ],
    [false, false]
  >
>;

/** The families this home owns, so none is correct and unreached. */
export interface ViteGraphTypeSurface {
  readonly update: HotUpdate;
  readonly disposition: HotUpdateDisposition;
}
