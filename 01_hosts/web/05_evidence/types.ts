/**
 * Browser evidence producers: probes and watchers.
 *
 * Core owns evidence vocabulary, codomains, defaults, precedence, classifiers,
 * and hysteresis. This home owns the actual physical producers: one-shot
 * probes that read and own nothing, and live watchers that subscribe and own
 * their subscription. Every producer is parameterized by the exact core
 * source it implements, and its emitted updates derive their source from that
 * same parameter — advertised source and emitted source are one identity. A
 * promised source with no producer, or a producer asserting a source core
 * never declared, is the population defect assurance exists to catch.
 *
 * A fact already settled faithfully in CSS does not gain a JavaScript producer
 * merely because web could observe it; the compiler decides when another
 * egress or live requirement justifies a browser source.
 *
 * @module
 */

import type {
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  NonEmptyTuple,
  OutputOf,
  Reference,
  Result,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  EvidenceReference,
  EvidenceSourceId,
  EvidenceUpdate,
} from '../../../00_core/06_evidence/types.js';
import type { GroundingId, RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { WebGroundingDefinition } from '../00_bootstrap/types.js';

export type WebProducerId<Name extends string = string> = Brand<Name, 'liteship.web.producer-id'>;
export type WebProducerReference<Id extends WebProducerId = WebProducerId> = Reference<
  'web-producer',
  Id
>;

/**
 * One evidence update whose source is the exact core source identity it was
 * produced for — the emission derives its source from the producer's own
 * identity parameter, never from an independently writable field. The
 * parameter has no default: an update that does not say which source it
 * updates is not a lawful type.
 */
export interface SourcedEvidenceUpdate<Source extends EvidenceSourceId>
  extends EvidenceUpdate {
  readonly source: EvidenceReference<Source>;
}

/**
 * One-shot physical read of one exact core source. It creates nothing and
 * owns nothing. The source parameter has no default — a probe form that
 * erases its source identity does not exist.
 */
export interface WebProbe<Source extends EvidenceSourceId> {
  readonly id: WebProducerReference;
  readonly produces: Source;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'unowned'>;
}

/**
 * Live subscription producing evidence over time. It owns its subscription
 * and can actually emit what it watches: `next` yields the admitted update
 * for the exact core source this watcher is parameterized by. `produces` and
 * the emitted update source are the same identity — a watcher declared for
 * source A cannot return an update for source B — and the parameter has no
 * default, so the plain unparameterized watcher form is not a lawful way to
 * construct a producer. Live watchers originate from the source-correlated
 * facility path; a manual widening to `WebWatcher<EvidenceSourceId>` is
 * erased inspection, never the governed construction form.
 */
export interface WebWatcher<Source extends EvidenceSourceId> {
  readonly id: WebProducerReference;
  readonly produces: Source;
  readonly next: Signature<
    WebProducerReference,
    SourcedEvidenceUpdate<Source>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * Narrow intrinsic authority over physical observation: it can read one fact
 * once, and it can stand up a live watch. Both operations are correlated on
 * the exact source identity they were asked for — reading source A yields an
 * update of source A, and watching source A yields a watcher of source A. A
 * facility that could only read could not honestly back a watcher, no matter
 * what a README called it.
 */
export interface ProbeFacility {
  readonly read: <Source extends EvidenceSourceId>(
    source: Source,
  ) => Result<SourcedEvidenceUpdate<Source>, NonEmptyTuple<Diagnostic>>;
  readonly watch: <Source extends EvidenceSourceId>(
    source: Source,
  ) => Result<WebWatcher<Source>, NonEmptyTuple<Diagnostic>>;
}

export type ProbeFacilityRequirement = Hole<'liteship.web.probe-facility', ProbeFacility>;

/** Intrinsic grounding: the producer authority derived from matchMedia and peers. */
export interface ProbeFacilityGrounding
  extends WebGroundingDefinition<readonly [ProbeFacilityRequirement], unknown, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.probe-facility'>;
}

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

/**
 * Type summary consumed by the web topology. Producers are exposed through
 * the facility's source-correlated contracts, never as unparameterized
 * producer values — the surface carries no broad watcher, probe, or update
 * form to widen through.
 */
export interface WebEvidenceTypeSurface {
  readonly read: ProbeFacility['read'];
  readonly watch: ProbeFacility['watch'];
  readonly facility: ProbeFacilityGrounding;
}
