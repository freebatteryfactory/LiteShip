/**
 * Web bootstrap: the only place raw browser globals exist.
 *
 * Beneath this boundary the bootstrap may physically capture `window`,
 * `document`, `navigator`, and platform constructors. Above it, the governed
 * web surface holds only narrow admitted capabilities, each entering through a
 * declared grounding with an explicit origin. No `Window`-shaped optional
 * context ever crosses upward, and no module outside this home reads ambient
 * browser state.
 *
 * @module
 */

import type {
  CaseOf,
  NonEmptyTuple,
  RequirementRow,
  TagOf,
} from '../../../types.js';
import type {
  ExecutionBackend,
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
import type { Signature } from '../../../types.js';

/**
 * The web realm, derived from the umbrella authority rather than restated.
 */
export type WebRealm = Extract<HostRealm, 'web'>;

export type WebHostId = HostId<'liteship.host.web'>;
export type WebHostReference = HostReference<WebHostId>;

/** The web host definition, mechanically tied to its catalog's identity and realm. */
export type WebHostDefinition = HostDefinition<WebHostId, WebRealm>;

/** The web host's erased capability catalog: declared grounding slots and offers. */
export type WebCapabilityCatalog = HostCapabilityCatalog<WebHostId, WebRealm>;

/**
 * A grounding slot declared by the web host: identical admission machinery to
 * the umbrella, with the host, realm, and allowed origin pinned. A slot
 * declares which explicit ingress its value may use — a sink policy cannot
 * suddenly claim to be a browser intrinsic. The admitted value is always a
 * narrow authority derived from a browser global, never the global itself.
 */
export interface WebGroundingDefinition<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Input = unknown,
  Origin extends TagOf<HostGroundingOrigin> = TagOf<HostGroundingOrigin>,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> extends HostGroundingDefinition<Provides, Input> {
  readonly host: WebHostReference;
  readonly realm: WebRealm;
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
 * Backends a web-owned residual offer may lawfully advertise, by derivation.
 * `html-css` is platform settlement that ended before residual execution
 * began; `worker` is a sibling realm; trusted host execution never runs here.
 */
export type WebPlacedBackend = Extract<ExecutionBackend, 'javascript' | 'wasm' | 'webgpu'>;

/**
 * Settlement locations a web-owned offer may lawfully advertise, by
 * derivation. `remote` is included because web physically realizes the
 * remote-evidence transport — SSE, fetch, and browser streams are the
 * settlement class this host exists to consume.
 */
export type WebSettlementLocation = Extract<SettlementLocation, 'local' | 'live' | 'remote'>;

/**
 * A realization offer declared by the web host, with its physical placement
 * pinned: the realm row is exactly web, the locations are the browser's, and
 * the backends exclude server, host-native, and the worker realm. A web offer
 * is structurally unable to advertise a placement web does not own.
 */
export interface WebRealizationOffer<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Requires extends RequirementRow = RequirementRow,
  Input = unknown,
  Cause = unknown,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> extends RealizationOffer<Provides, Requires, Input, Cause, Life> {
  readonly realms: NonEmptyTuple<WebRealm>;
  readonly locations: NonEmptyTuple<WebSettlementLocation>;
  readonly backends: NonEmptyTuple<WebPlacedBackend>;
}

/** Type summary consumed by the web topology. */
export interface WebBootstrapTypeSurface {
  readonly realm: WebRealm;
  readonly definition: WebHostDefinition;
  readonly catalog: WebCapabilityCatalog;
  readonly grounding: WebGroundingDefinition;
  readonly offer: WebRealizationOffer;
}
