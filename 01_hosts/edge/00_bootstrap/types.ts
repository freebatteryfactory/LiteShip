/**
 * Edge bootstrap: the only place raw edge globals and bindings exist.
 *
 * Edge models one constrained request invocation plus deployment-scoped
 * physical providers whose availability and lifecycle are explicitly
 * admitted. It assumes no process permanence, no arbitrary OS access, and no
 * stable in-memory singleton across invocations. Beneath this boundary the
 * bootstrap may capture the platform's invocation context and environment
 * bindings; above it, only narrow admitted capabilities exist, and no module
 * reads ambient environment state.
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
  GroundingId,
  NonEmptyRequirementRow,
  RealizationLifecycle,
  RealizationOffer,
  SettlementLocation,
} from '../../../00_core/14_compiler/types.js';
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

/** The edge realm, derived from the umbrella authority rather than restated. */
export type EdgeRealm = Extract<HostRealm, 'edge'>;

export type EdgeHostId = HostId<'liteship.host.edge'>;
export type EdgeHostReference = HostReference<EdgeHostId>;

/** The edge host definition, mechanically tied to its catalog's identity and realm. */
export type EdgeHostDefinition = HostDefinition<EdgeHostId, EdgeRealm>;

/** The edge host's erased capability catalog. */
export type EdgeCapabilityCatalog = HostCapabilityCatalog<EdgeHostId, EdgeRealm>;

/**
 * A grounding slot declared by the edge host, with host, realm, allowed
 * origin, and exact custody pinned.
 */
export interface EdgeGroundingDefinition<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Input = unknown,
  Origin extends TagOf<HostGroundingOrigin> = TagOf<HostGroundingOrigin>,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> extends HostGroundingDefinition<Provides, Input> {
  readonly host: EdgeHostReference;
  readonly realm: EdgeRealm;
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
 * Backends an edge-owned offer may lawfully advertise, by derivation:
 * javascript and wasm. Webgpu, host-native, server, sibling realms, and
 * platform-settled html-css never run here.
 */
export type EdgePlacedBackend = Extract<ExecutionBackend, 'javascript' | 'wasm'>;

/**
 * Settlement locations an edge-owned offer may lawfully advertise, by
 * derivation: exactly `request`. Everything edge settles, it settles at
 * request time — local derivation belongs to web and worker, live and remote
 * evidence to the realms that host them.
 */
export type EdgeSettlementLocation = Extract<SettlementLocation, 'request'>;

/**
 * A realization offer declared by the edge host, with placement pinned: the
 * realm row is exactly edge, the location is exactly request-time, and the
 * backends are derived.
 */
export interface EdgeRealizationOffer<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Requires extends RequirementRow = RequirementRow,
  Input = unknown,
  Cause = unknown,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> extends RealizationOffer<Provides, Requires, Input, Cause, Life> {
  readonly realms: NonEmptyTuple<EdgeRealm>;
  readonly locations: NonEmptyTuple<EdgeSettlementLocation>;
  readonly backends: NonEmptyTuple<EdgePlacedBackend>;
}

/**
 * One invocation's admitted context: its identity, cancellation authority,
 * and the physical address of its entry. The invocation is the lifetime unit
 * of the realm — deployment-scoped providers outlive it explicitly, never
 * ambiently.
 */
export interface EdgeInvocationContext {
  readonly cancelled: Signature<
    EdgeInvocationContext['address'],
    boolean,
    readonly []
  >;
  readonly address: ContentAddress<'application/vnd.liteship.edge-invocation+cbor'>;
}

/** Admitted deployment configuration: exact, decoded, never a raw environment map. */
export interface EdgeDeploymentConfiguration {
  readonly address: ContentAddress<'application/vnd.liteship.edge-deployment+cbor'>;
}

export type EdgeInvocationRequirement = Hole<'liteship.edge.invocation', EdgeInvocationContext>;
export type EdgeDeploymentRequirement = Hole<
  'liteship.edge.deployment-configuration',
  EdgeDeploymentConfiguration
>;

/** Invocation grounding: the invocation context carried by the entry itself. */
export interface EdgeInvocationGrounding
  extends EdgeGroundingDefinition<
    readonly [EdgeInvocationRequirement],
    unknown,
    'invocation',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.invocation'>;
}

/** Deployment grounding: admitted configuration, never a raw environment map. */
export interface EdgeDeploymentGrounding
  extends EdgeGroundingDefinition<
    readonly [EdgeDeploymentRequirement],
    unknown,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.deployment-configuration'>;
}

/** Type summary consumed by the edge topology. */
export interface EdgeBootstrapTypeSurface {
  readonly realm: EdgeRealm;
  readonly definition: EdgeHostDefinition;
  readonly catalog: EdgeCapabilityCatalog;
  readonly grounding: EdgeGroundingDefinition;
  readonly offer: EdgeRealizationOffer;
  readonly invocation: EdgeInvocationContext;
  readonly entry: EdgeInvocationGrounding;
  readonly deployment: EdgeDeploymentGrounding;
}
