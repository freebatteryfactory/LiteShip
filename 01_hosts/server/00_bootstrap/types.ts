/**
 * Server bootstrap: the only place raw process globals and environment exist.
 *
 * Server models a trusted general-purpose physical host: broad OS, process,
 * storage, network, secret, native-tool, and long-lived-service authority —
 * when exact groundings and offers supply them. "Trusted general-purpose"
 * describes the breadth the realm can lawfully hold; it does not mean every
 * server value is trusted, every process long-lived, or every operation
 * authorized. Each realization pins its actual lifecycle and facilities — a
 * serverless process, a long-running Node service, and another native host
 * are never assumed equivalent because they execute server-side JavaScript.
 *
 * Beneath this boundary the bootstrap may capture process globals and the
 * raw environment map; above it, only narrow admitted capabilities exist.
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

/** The server realm, derived from the umbrella authority rather than restated. */
export type ServerRealm = Extract<HostRealm, 'server'>;

export type ServerHostId = HostId<'liteship.host.server'>;
export type ServerHostReference = HostReference<ServerHostId>;

/** The server host definition, mechanically tied to its catalog's identity and realm. */
export type ServerHostDefinition = HostDefinition<ServerHostId, ServerRealm>;

/** The server host's erased capability catalog. */
export type ServerCapabilityCatalog = HostCapabilityCatalog<ServerHostId, ServerRealm>;

/**
 * A grounding slot declared by the server host, with host, realm, allowed
 * origin, and exact custody pinned.
 */
export interface ServerGroundingDefinition<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Input = unknown,
  Origin extends TagOf<HostGroundingOrigin> = TagOf<HostGroundingOrigin>,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> extends HostGroundingDefinition<Provides, Input> {
  readonly host: ServerHostReference;
  readonly realm: ServerRealm;
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
 * Backends a server-owned residual offer may lawfully advertise, by
 * derivation: javascript, wasm, and host-native — the native arm is what
 * makes server the realm where native execution paths can be offered at all.
 * Webgpu, sibling realms, `server`-as-a-backend-name, and platform-settled
 * html-css are excluded.
 */
export type ServerPlacedBackend = Extract<ExecutionBackend, 'javascript' | 'wasm' | 'host-native'>;

/**
 * Settlement locations a server-owned offer may lawfully advertise, by
 * derivation: local derivation and live evidence within the server's own
 * realm. Request settlement is edge's; remote-evidence transport is the
 * consuming realm's.
 */
export type ServerSettlementLocation = Extract<SettlementLocation, 'local' | 'live'>;

/**
 * A realization offer declared by the server host, with placement pinned.
 */
export interface ServerRealizationOffer<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Requires extends RequirementRow = RequirementRow,
  Input = unknown,
  Cause = unknown,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> extends RealizationOffer<Provides, Requires, Input, Cause, Life> {
  readonly realms: NonEmptyTuple<ServerRealm>;
  readonly locations: NonEmptyTuple<ServerSettlementLocation>;
  readonly backends: NonEmptyTuple<ServerPlacedBackend>;
}

/** The admitted process entry: identity and shutdown context of this invocation of the host. */
export interface ServerProcessEntry {
  readonly address: ContentAddress<'application/vnd.liteship.server-entry+cbor'>;
}

/** Admitted server configuration: exact and decoded, never a raw environment map. */
export interface ServerConfiguration {
  readonly address: ContentAddress<'application/vnd.liteship.server-configuration+cbor'>;
}

export type ServerEntryRequirement = Hole<'liteship.server.process-entry', ServerProcessEntry>;
export type ServerConfigurationRequirement = Hole<
  'liteship.server.configuration',
  ServerConfiguration
>;

/** Invocation grounding: the process entry carried by starting the host. */
export interface ServerEntryGrounding
  extends ServerGroundingDefinition<
    readonly [ServerEntryRequirement],
    ServerProcessEntry,
    'invocation',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.process-entry'>;
}

/** Deployment grounding: admitted configuration, never a raw environment map. */
export interface ServerConfigurationGrounding
  extends ServerGroundingDefinition<
    readonly [ServerConfigurationRequirement],
    ServerConfiguration,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.configuration'>;
}

/** Type summary consumed by the server topology. */
export interface ServerBootstrapTypeSurface {
  readonly realm: ServerRealm;
  readonly definition: ServerHostDefinition;
  readonly catalog: ServerCapabilityCatalog;
  readonly grounding: ServerGroundingDefinition;
  readonly offer: ServerRealizationOffer;
  readonly entry: ServerEntryGrounding;
  readonly configuration: ServerConfigurationGrounding;
}
