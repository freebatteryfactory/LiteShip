/**
 * Process authority: the admitted host process and constructed children.
 *
 * This home owns the narrow admitted host-process authority — identity,
 * platform profile, stdio resources, signals — and the child-process
 * provider whose children are repeatable per-use resources with scoped
 * environment, working directory, and limits. It supplies mechanics that
 * native tools compose over; it does not make every process invocation a
 * tool, and it never exposes a raw process global or ambient environment.
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
  Signature,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';

export type ProcessId<Name extends string = string> = Brand<Name, 'liteship.server.process-id'>;
export type ProcessReference<Id extends ProcessId = ProcessId> = Reference<'server-process', Id>;

/** The closed signal vocabulary this realm speaks. */
export type ProcessSignal = 'interrupt' | 'terminate' | 'hangup';

/** One stdio stream role. */
export type StdioRole = 'stdin' | 'stdout' | 'stderr';

/** One stdio resource of the process that owns it. */
export interface StdioResource {
  readonly process: ProcessReference;
  readonly role: StdioRole;
}

/** The exit relationship of one child process, phase-correct. */
export type ProcessExit = Algebra<{
  exited: { readonly receipt: ContentAddress<'application/vnd.liteship.server-process-exit+cbor'> };
  signalled: { readonly signal: ProcessSignal };
  crashed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * The admitted host process: a narrow authority over this process — never a
 * raw global. It is grounded, unowned: the platform holds its lifetime.
 */
export interface HostProcessAuthority {
  readonly id: ProcessReference;
  readonly stdio: readonly StdioResource[];
  readonly signal: Signature<ProcessSignal, ProcessReference, NonEmptyTuple<Diagnostic>>;
}

/** The complete child request: scoped configuration address, never ambient inheritance. */
export interface ChildProcessRequest {
  readonly configuration: ContentAddress<'application/vnd.liteship.server-child-configuration+cbor'>;
}

/**
 * One live child process: a per-use owned resource with scoped environment
 * and limits behind its configuration address, its own stdio, cancellation,
 * and a phase-correct exit.
 */
export interface ChildProcess {
  readonly id: ProcessReference;
  readonly configuration: ChildProcessRequest['configuration'];
  readonly stdio: readonly StdioResource[];
  readonly cancel: Signature<ProcessReference, ProcessReference, NonEmptyTuple<Diagnostic>>;
  readonly exit: ProcessExit;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The child-process provider: children are repeatable per-use resources. */
export interface ChildProcessAuthority {
  readonly spawn: Signature<ChildProcessRequest, ChildProcess, NonEmptyTuple<Diagnostic>>;
}

export type ProcessAuthorityRequirement = Hole<'liteship.server.process', HostProcessAuthority>;
export type ChildProcessRequirement = Hole<'liteship.server.child-process', ChildProcessAuthority>;

/** Intrinsic grounding: the host process, admitted narrowly. */
export interface ProcessFacilityGrounding
  extends ServerGroundingDefinition<
    readonly [ProcessAuthorityRequirement],
    HostProcessAuthority,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.process-facility'>;
}

/** Constructing the child-process provider over the host process. */
export interface ChildProcessOffer
  extends ServerRealizationOffer<
    readonly [ChildProcessRequirement],
    readonly [ProcessAuthorityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.child-process'>;
  readonly locations: NonEmptyTuple<'local'>;
  readonly backends: NonEmptyTuple<'javascript' | 'host-native'>;
}

/** Type summary consumed by the server topology. */
export interface ServerProcessTypeSurface {
  readonly host: HostProcessAuthority;
  readonly child: ChildProcess;
  readonly exit: ProcessExit;
  readonly authority: ChildProcessAuthority;
  readonly facility: ProcessFacilityGrounding;
  readonly childOffer: ChildProcessOffer;
}
