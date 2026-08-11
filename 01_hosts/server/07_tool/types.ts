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
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
  TagOf,
} from '../../../types.js';
import type { CanonicalValue, ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { SchemaId, SchemaReference } from '../../../00_core/03_schema/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';
import type { ChildProcessRequirement } from '../01_process/types.js';
import type { FilesystemRootReference } from '../03_filesystem/types.js';

export type ToolId<Name extends string = string> = Brand<Name, 'liteship.server.tool-id'>;
export type ToolReference<Id extends ToolId = ToolId> = Reference<'server-tool', Id>;
export type ToolVersion = Brand<string, 'liteship.server.tool-version'>;

/** Declared determinism of one tool profile. */
export type ToolDeterminism = Algebra<{
  deterministic: {};
  nondeterministic: {};
}>;

/** One admitted tool profile: exact identity, version, and determinism evidence. */
export interface ToolProfile<Tool extends ToolId> {
  readonly tool: ToolReference<Tool>;
  readonly version: ToolVersion;
  readonly determinism: ToolDeterminism;
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
export interface ToolInvocationRequest<Tool extends ToolId> {
  readonly profile: ToolProfile<Tool>;
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
export interface ToolExecution<Tool extends ToolId> {
  readonly profile: ToolProfile<Tool>;
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
  readonly invoke: <Tool extends ToolId>(
    request: ToolInvocationRequest<Tool>,
  ) => Result<ToolExecution<Tool>, NonEmptyTuple<Diagnostic>>;
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
    unknown,
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

// ---------------------------------------------------------------------------
// Laws
//
// That sandbox scopes are honored and determinism claims hold at runtime are
// `system/assurance`; spawn-versus-pool crossover is empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: an invocation pins its exact tool — A is not B. */
export type AnInvocationCannotClaimAnotherTool = Assert<
  Equal<
    [
      ToolProfile<ToolId<'liteship.server.tool.law.tool-a'>>['tool'],
      ToolExecution<ToolId<'liteship.server.tool.law.tool-b'>> extends ToolExecution<
        ToolId<'liteship.server.tool.law.tool-a'>
      >
        ? true
        : false,
    ],
    [ToolReference<ToolId<'liteship.server.tool.law.tool-a'>>, false]
  >
>;

/** Compile-time law: invocation is tool-correlated through the provider's generic operation. */
export type InvocationIsToolCorrelated = Assert<
  Equal<
    ToolAuthority['invoke'] extends (
      request: ToolInvocationRequest<ToolId<'liteship.server.tool.law.tool-a'>>,
    ) => Result<ToolExecution<ToolId<'liteship.server.tool.law.tool-a'>>, NonEmptyTuple<Diagnostic>>
      ? true
      : false,
    true
  >
>;

/**
 * Compile-time law: an invocation carries the actual input value beside its
 * contracts and a declared sandbox, and an execution yields an actual
 * result — a produced value with its receipt, or a failure — for exactly its
 * own tool.
 */
export type AnInvocationCarriesContractsAndSandbox = Assert<
  Equal<
    [
      ToolInvocationRequest<ToolId>['value'],
      ToolInvocationRequest<ToolId>['sandbox'],
      ToolExecution<ToolId<'liteship.server.tool.law.tool-a'>>['result'],
      CaseOf<ToolOutcome, 'produced'>['value'],
      TagOf<ToolDeterminism>,
    ],
    [
      CanonicalValue,
      ToolSandbox,
      Signature<
        ToolReference<ToolId<'liteship.server.tool.law.tool-a'>>,
        ToolOutcome,
        NonEmptyTuple<Diagnostic>
      >,
      CanonicalValue,
      'deterministic' | 'nondeterministic',
    ]
  >
>;

/** Compile-time law: an execution is receipted and owned. */
export type AnExecutionIsReceiptedAndOwned = Assert<
  Equal<
    [ToolExecution<ToolId>['receipt'], ToolExecution<ToolId>['lifecycle']],
    [
      ContentAddress<'application/vnd.liteship.server-tool-receipt+cbor'>,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;

/** Type summary consumed by the server topology. */
export interface ServerToolTypeSurface {
  readonly profile: ToolProfile<ToolId>;
  readonly execution: ToolExecution<ToolId>;
  readonly outcome: ToolOutcome;
  readonly authority: ToolAuthority;
  readonly catalogGrounding: ToolCatalogGrounding;
  readonly toolOffer: ToolAuthorityOffer;
}
