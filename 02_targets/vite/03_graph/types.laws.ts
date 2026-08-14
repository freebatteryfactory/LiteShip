/**
 * Compile-time laws for `02_targets/vite/03_graph`.
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

import type { RevisionId, RevisionReference } from '../../../00_core/02_identity/types.js';
import type { StreamSequence } from '../../../00_core/04_time/types.js';
import type { Assert, CaseOf, Equal } from '../../../types.js';
import type { TargetConfigurationId, TargetConfigurationRevision } from '../../types.js';
import type { BuildEnvironmentName } from '../00_integration/types.js';
import type { HotUpdate, HotUpdateDisposition } from './types.js';

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
