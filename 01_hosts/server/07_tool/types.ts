/**
 * Native tools: exact profiles, typed invocations, sandboxed scope.
 *
 * This home owns native-tool provider authority: tool identity with version
 * profile, discovery and admission, tool-correlated typed invocation,
 * sandbox scope, stream handling, timeout and cancellation shape,
 * determinism evidence, and receipts. It owns the physical tool contract —
 * never the tool's semantic domain: what ffmpeg means to media is media's
 * business; that ffmpeg runs sandboxed with a typed contract is this home's.
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
  Result,
  Signature,
} from '../../../types.js';
import type { CanonicalValue, ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { SchemaId, SchemaReference } from '../../../00_core/03_schema/types.js';
import type { ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';
import type { ChildProcessRequirement } from '../01_process/types.js';
import type { FilesystemRootReference } from '../03_filesystem/types.js';

export type ToolId<Name extends string = string> = Brand<Name, 'liteship.server.tool-id'>;
export type ToolReference<Id extends ToolId = ToolId> = Reference<'server-tool', Id>;
export type ToolVersion = Brand<string, 'liteship.server.tool-version'>;

export type ToolProfileId<Name extends string = string> = Brand<Name, 'liteship.server.tool-profile-id'>;
export type ToolProfileReference<Id extends ToolProfileId = ToolProfileId> = Reference<
  'server-tool-profile',
  Id
>;

/**
 * One admitted tool profile: exact identity, exact bytes, exact configuration,
 * and an evidence-backed reproducibility claim.
 *
 * The predecessor shape carried a name, a version string, and a two-arm
 * determinism algebra whose arms were both empty — a tool could assert
 * determinism while naming no binary, no options, and no witness. Nothing
 * downstream could tell a pinned static build from whatever happened to be on
 * the PATH, which is the entire content of a reproducibility claim about a
 * native encoder.
 *
 * The claim is parameterized over this profile's *reference*, not over the
 * profile itself. A profile containing a claim parameterized by that same
 * profile is a type that contains itself.
 */
export interface ToolProfile<Tool extends ToolId, Profile extends ToolProfileId = ToolProfileId> {
  readonly id: ToolProfileReference<Profile>;
  readonly tool: ToolReference<Tool>;
  readonly version: ToolVersion;
  readonly executable: ContentAddress;
  readonly options: ContentAddress<'application/vnd.liteship.server-tool-options+cbor'>;
  readonly environment: ContentAddress<'application/vnd.liteship.server-tool-environment+cbor'>;
  readonly reproducibility: ReproducibilityClaim<ToolProfileReference<Profile>>;
}

/** The sandbox scope one invocation runs under — declared, never ambient. */
export interface ToolSandbox {
  readonly filesystem: readonly FilesystemRootReference[];
  readonly network: boolean;
}

/**
 * One tool invocation request, correlated to the exact tool: input and
 * output contracts, sandbox, and the profile it targets.
 */
export interface ToolInvocationRequest<Tool extends ToolId, Profile extends ToolProfileId = ToolProfileId> {
  readonly profile: ToolProfile<Tool, Profile>;
  readonly input: SchemaReference<SchemaId, unknown>;
  readonly value: CanonicalValue;
  readonly output: SchemaReference<SchemaId, unknown>;
  readonly sandbox: ToolSandbox;
}

/** The outcome of one tool execution: a produced value with its receipt, or failure. */
export type ToolOutcome = Algebra<{
  produced: {
    readonly value: CanonicalValue;
    readonly receipt: ContentAddress<'application/vnd.liteship.server-tool-receipt+cbor'>;
  };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * One live tool execution: bound to the exact tool, cancellable, owned, and
 * receipted.
 */
export interface ToolExecution<Tool extends ToolId, Profile extends ToolProfileId = ToolProfileId> {
  readonly profile: ToolProfile<Tool, Profile>;
  readonly cancel: Signature<ToolReference<Tool>, ToolReference<Tool>, NonEmptyTuple<Diagnostic>>;
  readonly result: Signature<ToolReference<Tool>, ToolOutcome, NonEmptyTuple<Diagnostic>>;
  readonly receipt: ContentAddress<'application/vnd.liteship.server-tool-receipt+cbor'>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * The tool provider: invocation is tool-correlated — invoking tool A yields
 * an execution of A, provably not of B.
 */
export interface ToolAuthority {
  readonly invoke: <Tool extends ToolId, Profile extends ToolProfileId>(
    request: ToolInvocationRequest<Tool, Profile>,
  ) => Result<ToolExecution<Tool, Profile>, NonEmptyTuple<Diagnostic>>;
}

/** The admitted tool roster beneath the provider. */
export interface ToolCatalogBinding {
  readonly admitted: true;
}

export type ToolCatalogRequirement = Hole<'liteship.server.tool-catalog', ToolCatalogBinding>;
export type ToolAuthorityRequirement = Hole<'liteship.server.tools', ToolAuthority>;

/** Deployment grounding: the tool roster enters admitted. */
export interface ToolCatalogGrounding
  extends ServerGroundingDefinition<
    readonly [ToolCatalogRequirement],
    ToolCatalogBinding,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.tool-catalog'>;
}

/** Constructing the tool provider over child processes. */
export interface ToolAuthorityOffer
  extends ServerRealizationOffer<
    readonly [ToolAuthorityRequirement],
    readonly [ToolCatalogRequirement, ChildProcessRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.tool-authority'>;
  readonly locations: NonEmptyTuple<'local'>;
  readonly backends: NonEmptyTuple<'host-native'>;
}

/** Type summary consumed by the server topology. */
export interface ServerToolTypeSurface {
  readonly profile: ToolProfile<ToolId>;
  readonly execution: ToolExecution<ToolId>;
  readonly outcome: ToolOutcome;
  readonly authority: ToolAuthority;
  readonly catalogGrounding: ToolCatalogGrounding;
  readonly toolOffer: ToolAuthorityOffer;
}
