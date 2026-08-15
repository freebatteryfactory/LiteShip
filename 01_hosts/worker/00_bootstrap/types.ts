/**
 * Worker bootstrap: the only place raw isolated-realm globals exist.
 *
 * Worker models one single-bootstrap isolated execution session. Beneath this
 * boundary the bootstrap may physically capture the worker global scope, the
 * entry message machinery, and platform constructors. Above it, the governed
 * worker surface holds only narrow admitted capabilities, each entering
 * through a declared grounding with an explicit origin. The parent realm owns
 * construction; this realm owns everything after entry — the constitutional
 * contract is not tied to one constructor name, and a browser dedicated
 * worker or a server worker thread satisfies it only through separate exact
 * offers. Compatibility is never inferred because both are called workers.
 *
 * @module
 */

import type {
  CaseOf,
  Hole,
  NonEmptyTuple,
  RequirementRow,
  Signature,
  TagOf,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type {
  ExecutionBackend,
  NonEmptyRequirementRow,
  RealizationCatalogAddress,
  RealizationLifecycle,
  RealizationOffer,
  SettlementLocation,
} from '../../../00_core/14_compiler/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type {
  HostAdmissionFailure,
  HostCapabilityCatalog,
  HostDefinition,
  HostGroundingDefinition,
  HostGroundingInstance,
  HostGroundingOrigin,
  HostId,
  HostRealm,
  HostReference,
} from '../../types.js';
import type { GroundingId } from '../../../00_core/14_compiler/types.js';

/** The worker realm, derived from the umbrella authority rather than restated. */
export type WorkerRealm = Extract<HostRealm, 'worker'>;

export type WorkerHostId = HostId<'liteship.host.worker'>;
export type WorkerHostReference = HostReference<WorkerHostId>;

/** The worker host definition, mechanically tied to its catalog's identity and realm. */
export type WorkerHostDefinition = HostDefinition<WorkerHostId, WorkerRealm>;

/** The worker host's erased capability catalog: declared grounding slots and offers. */
export type WorkerCapabilityCatalog = HostCapabilityCatalog<WorkerHostId, WorkerRealm>;

/**
 * A grounding slot declared by the worker host: identical admission machinery
 * to the umbrella, with the host, realm, allowed origin, and exact custody
 * pinned. The admitted value is always a narrow authority derived from the
 * isolated realm's globals, never the global scope itself.
 */
export interface WorkerGroundingDefinition<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Input = unknown,
  Origin extends TagOf<HostGroundingOrigin> = TagOf<HostGroundingOrigin>,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> extends HostGroundingDefinition<Provides, Input> {
  readonly host: WorkerHostReference;
  readonly realm: WorkerRealm;
  readonly origin: CaseOf<HostGroundingOrigin, Origin>;
  readonly custody: Life;
  readonly admit: Signature<
    Input,
    HostGroundingInstance<Provides, Life>,
    HostAdmissionFailure,
    readonly []
  >;
}

/**
 * Backends a worker-owned residual offer may lawfully advertise, by
 * derivation. The initial profile is exactly javascript and wasm: `webgpu`
 * inside a worker is an optional future offer that must pin its exact
 * prerequisites rather than appearing in a broad default union; `worker` as a
 * backend name is another realm's way of scheduling into this one; trusted
 * host execution and platform-settled `html-css` never run here.
 */
export type WorkerPlacedBackend = Extract<ExecutionBackend, 'javascript' | 'wasm'>;

/**
 * Settlement locations a worker-owned offer may lawfully advertise, by
 * derivation: local derivation and live evidence lanes. Remote-evidence
 * transport is web's; request settlement is edge's; build and platform ended
 * before any realm existed.
 */
export type WorkerSettlementLocation = Extract<SettlementLocation, 'local' | 'live'>;

/**
 * A realization offer declared by the worker host, with its physical
 * placement pinned: the realm row is exactly worker, and the backends and
 * locations are derived, so a worker offer is structurally unable to
 * advertise a placement the realm does not own.
 */
export interface WorkerRealizationOffer<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Requires extends RequirementRow = RequirementRow,
  Input = unknown,
  Cause = unknown,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> extends RealizationOffer<Provides, Requires, Input, Cause, Life> {
  readonly realms: NonEmptyTuple<WorkerRealm>;
  readonly locations: NonEmptyTuple<WorkerSettlementLocation>;
  readonly backends: NonEmptyTuple<WorkerPlacedBackend>;
}

/**
 * The one invocation payload that enters the realm: program identity, catalog
 * ancestry, transaction generation, and the entry channel's identity, all
 * admitted rather than trusted. The envelope is invocation input — the parent
 * wrote it, this realm decodes it. There is no second entry payload.
 */
export interface WorkerBootstrapEnvelope {
  readonly program: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly catalog: RealizationCatalogAddress;
  readonly generation: TransactionGeneration;
  readonly address: ContentAddress<'application/vnd.liteship.worker-bootstrap+cbor'>;
}

/** Narrow intrinsic authority over the admitted realm scope — never the global itself. */
export interface RealmScopeFacility {
  readonly realm: WorkerRealm;
  readonly host: WorkerHostReference;
}

export type RealmScopeRequirement = Hole<'liteship.worker.realm-scope', RealmScopeFacility>;
export type BootstrapEnvelopeRequirement = Hole<
  'liteship.worker.bootstrap-envelope',
  WorkerBootstrapEnvelope
>;

/** Intrinsic grounding: the isolated realm's own admitted scope. */
export interface RealmScopeGrounding
  extends WorkerGroundingDefinition<readonly [RealmScopeRequirement], RealmScopeFacility, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.worker.grounding.realm-scope'>;
}

/** Invocation grounding: the bootstrap envelope carried by the entry itself. */
export interface BootstrapEnvelopeGrounding
  extends WorkerGroundingDefinition<
    readonly [BootstrapEnvelopeRequirement],
    unknown,
    'invocation',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.worker.grounding.bootstrap-envelope'>;
}

/** Type summary consumed by the worker topology. */
export interface WorkerBootstrapTypeSurface {
  readonly realm: WorkerRealm;
  readonly definition: WorkerHostDefinition;
  readonly catalog: WorkerCapabilityCatalog;
  readonly grounding: WorkerGroundingDefinition;
  readonly offer: WorkerRealizationOffer;
  readonly envelope: WorkerBootstrapEnvelope;
  readonly scope: RealmScopeGrounding;
  readonly entry: BootstrapEnvelopeGrounding;
}
