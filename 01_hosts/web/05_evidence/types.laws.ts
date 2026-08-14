/**
 * Compile-time laws for `01_hosts/web/05_evidence`.
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

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { EvidenceReference, EvidenceSourceId } from '../../../00_core/06_evidence/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, OutputOf, Result } from '../../../types.js';
import type { ProbeFacility, SourcedEvidenceUpdate, WebProbe, WebWatcher } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That every promised browser source has a real producer, and that the browser
// and request classifiers keep their declared relationship, are assurance
// obligations over the producer population.
// ---------------------------------------------------------------------------

/**
 * Compile-time law: a producer names its exact core-owned source, never a
 * local name — and a producer of one source is not a producer of another.
 */
export type AProducerNamesACoreOwnedSource = Assert<
  Equal<
    [
      WebProbe<EvidenceSourceId<'liteship.evidence.law.source-a'>>['produces'],
      WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>['produces'],
      WebProbe<EvidenceSourceId<'liteship.evidence.law.source-b'>> extends WebProbe<
        EvidenceSourceId<'liteship.evidence.law.source-a'>
      >
        ? true
        : false,
    ],
    [
      EvidenceSourceId<'liteship.evidence.law.source-a'>,
      EvidenceSourceId<'liteship.evidence.law.source-a'>,
      false,
    ]
  >
>;


/** Compile-time law: a probe owns nothing; a watcher owns its subscription. */
export type AProbeOwnsNothingAWatcherOwnsItsSubscription = Assert<
  Equal<
    [
      WebProbe<EvidenceSourceId<'liteship.evidence.law.source-a'>>['lifecycle'],
      WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>['lifecycle'],
    ],
    [CaseOf<RealizationLifecycle, 'unowned'>, CaseOf<RealizationLifecycle, 'owned'>]
  >
>;


/**
 * Compile-time law: the facility is the provider — it reads once and stands
 * up live watchers as per-use resources, and both operations are correlated
 * on the exact source identity they were asked for. A watcher is never a
 * requirement hole, because two watchers on one page are two resources, not
 * one deduplicated capability name.
 */
export type WatchersAreResourcesFromTheProvider = Assert<
  Equal<
    [
      ProbeFacility['read'] extends (
        source: EvidenceSourceId<'liteship.evidence.law.source-a'>,
      ) => Result<
        SourcedEvidenceUpdate<EvidenceSourceId<'liteship.evidence.law.source-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      ProbeFacility['watch'] extends (
        source: EvidenceSourceId<'liteship.evidence.law.source-a'>,
      ) => Result<
        WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      OutputOf<WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>['next']>,
      readonly [
        WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>,
        WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>,
      ] extends readonly WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>[]
        ? true
        : false,
    ],
    [
      true,
      true,
      SourcedEvidenceUpdate<EvidenceSourceId<'liteship.evidence.law.source-a'>>,
      true,
    ]
  >
>;


/**
 * Compile-time law: a watcher emits its own source. The advertised identity
 * and the emitted update source derive from one parameter, and a watcher of
 * source A is not a watcher of source B.
 */
export type AWatcherEmitsItsOwnSource = Assert<
  Equal<
    [
      WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>['produces'],
      OutputOf<
        WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-a'>>['next']
      >['source'],
      WebWatcher<EvidenceSourceId<'liteship.evidence.law.source-b'>> extends WebWatcher<
        EvidenceSourceId<'liteship.evidence.law.source-a'>
      >
        ? true
        : false,
    ],
    [
      EvidenceSourceId<'liteship.evidence.law.source-a'>,
      EvidenceReference<EvidenceSourceId<'liteship.evidence.law.source-a'>>,
      false,
    ]
  >
>;
