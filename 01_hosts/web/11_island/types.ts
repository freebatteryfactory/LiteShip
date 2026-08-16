/**
 * Island activation and graph-cut joining.
 *
 * The activation decision is settlement meaning owned by the compiler; the
 * Astro target owns directive and lifecycle translation; this home owns the
 * physical act, declared as a real offer whose exact requirement row composes
 * the homes beneath it: a mount region, the commit-application authority, and
 * the browser execution host.
 *
 * The join is one addressed relationship: exact program, exact revision,
 * exact stream identity, the retained update window on that stream, and the
 * persistent region membership. A live island holds its persistent membership
 * — the transaction-scoped write authority is acquired per commit, never
 * frozen inside a long-lived instance.
 *
 * An inactive island is not a failure. Failure stays phase-correct: planning
 * refusal, admission failure, realization failure, or provider withdrawal —
 * each in its own channel.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  RequirementRow,
  Signature,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionReference } from '../../../00_core/02_identity/types.js';
import type { StreamSequence } from '../../../00_core/04_time/types.js';
import type { StreamResumeRequest } from '../../../00_core/13_stream/types.js';
import type {
  RealizationInstanceReference,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { WebRealizationOffer } from '../00_bootstrap/types.js';
import type {
  RegionAuthorityRequirement,
  RegionMembership,
} from '../01_region/types.js';
import type { ListenerReference } from '../03_event/types.js';
import type { CommitApplicationRequirement } from '../04_projection/types.js';
import type { ConnectionReference } from '../06_transport/types.js';
import type { WebExecutionRequirement } from '../10_execution/types.js';

/** Stable identity for one island. */
export type IslandId<Name extends string = string> = Brand<Name, 'liteship.web.island-id'>;
/** Typed reference to one island. */
export type IslandReference<Id extends IslandId = IslandId> = Reference<'web-island', Id>;

/**
 * One addressed resume window with exactly one stream owner: the core
 * `StreamResumeRequest` carries the stream identity, acknowledgement, and
 * checkpoint together, and the retained interval belongs to that stream —
 * no sibling stream field exists for the window to contradict.
 */
export interface IslandResumeWindow {
  readonly resume: StreamResumeRequest;
  readonly from: StreamSequence;
  readonly to: StreamSequence;
}

/**
 * One addressed join: everything an activation binds together, exactly. The
 * stream identity lives once, inside the resume window's request; the region
 * relationship is the owner `RegionMembership` type, not a restated twin; and
 * the transaction-scoped write authority is acquired per commit from that
 * membership — never frozen inside the long-lived island.
 */
export interface IslandJoin {
  readonly program: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly revision: RevisionReference;
  readonly window: IslandResumeWindow;
  readonly membership: RegionMembership;
  readonly address: ContentAddress<'application/vnd.liteship.web-island-join+cbor'>;
}

/**
 * One live island: the physical product of one activation. It records the
 * selected physical resources that constitute it — the execution and
 * projection instances, its listeners, its optional connection — and its
 * activation receipt, so disposal, explanation, and the two-island graph-cut
 * proof have addressable facts rather than a bare identity.
 */
export interface IslandInstance {
  readonly id: IslandReference;
  readonly join: IslandJoin;
  readonly execution: RealizationInstanceReference;
  readonly projection: RealizationInstanceReference;
  readonly subscriptions: readonly ListenerReference[];
  readonly connection?: ConnectionReference;
  readonly receipt: ContentAddress<'application/vnd.liteship.web-island-activation+cbor'>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * The island's honest state algebra. Inactive identifies its addressed join —
 * not a floating window — and carries no diagnostics, because
 * not-yet-activated is a lawful state of the world, not an error to be
 * explained.
 */
export type IslandState = Algebra<{
  inactive: { readonly join: IslandJoin };
  active: { readonly instance: IslandInstance };
}>;

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * The repeatable activation provider: `activate` consumes one exact addressed
 * join and returns one live island instance, as many times as the page has
 * islands. Two independently activated islands are two instances from two
 * joins — the graph-cut proof's first requirement — not one deduplicated
 * hole pretending the second island is a spelling mistake.
 */
export interface IslandActivationAuthority {
  readonly activate: Signature<IslandJoin, IslandInstance, NonEmptyTuple<Diagnostic>>;
}

/** Capability requirement for island authority. */
export type IslandAuthorityRequirement = Hole<'liteship.web.island-authority', IslandActivationAuthority>;

/**
 * Standing up the activation provider is a real offer. Its requirement row
 * composes the homes beneath it — the region manager whose memberships joins
 * carry, the commit-application authority, and the browser execution host —
 * with plan-selected extras entering through the generic row.
 */
export interface IslandActivationOffer<Extra extends RequirementRow = readonly []>
  extends WebRealizationOffer<
    readonly [IslandAuthorityRequirement],
    readonly [
      RegionAuthorityRequirement,
      CommitApplicationRequirement,
      WebExecutionRequirement,
      ...Extra,
    ],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.island-activation'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the web topology. */
export interface WebIslandTypeSurface {
  readonly window: IslandResumeWindow;
  readonly join: IslandJoin;
  readonly instance: IslandInstance;
  readonly state: IslandState;
  readonly authority: IslandActivationAuthority;
  readonly offer: IslandActivationOffer;
}
