/**
 * Wires: protocol and invocation projection.
 *
 * A wire carries an already-defined operation across a boundary and brings the
 * answer back. It owns the boundary and nothing on either side of it: core owns
 * what the operation means, hosts own the physical channel, and the wire owns
 * only the translation and what can go wrong during it.
 *
 * The whole design turns on one distinction that transports habitually
 * collapse. Three different things can go wrong at a boundary:
 *
 * 1. The request never became an invocation — malformed input, or a name the
 *    catalog does not have.
 * 2. The invocation ran and the operation refused, failed, or was cancelled.
 * 3. The operation ran and the answer did not get back.
 *
 * Every protocol in existence smears these together, which is why a 500 hides a
 * 400, a timeout reads as a business refusal, and a retry double-charges. They
 * are separate algebras here, and the third one carries a receipt, because the
 * single most expensive fact at a boundary is **the operation already ran**.
 *
 * `01_hosts` made the same cut for admission and paid for it in advance: a
 * boundary refusal is neither a rejection nor a failure, and it stays in its own
 * channel so neither can absorb it.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  DataPath,
  NonEmptyTuple,
  Reference,
} from '../types.js';
import type { Diagnostic } from '../00_core/00_error/types.js';
import type {
  IdempotencyKey,
  OperationId,
  OperationInvocation,
  OperationReceipt,
  OperationReference,
} from '../00_core/07_operation/types.js';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** Stable identity for one wire. */
export type WireId<Name extends string = string> = Brand<Name, 'liteship.wire-id'>;
/** Typed reference to one wire. */
export type WireReference<Id extends WireId = WireId> = Reference<'wire', Id>;

// ---------------------------------------------------------------------------
// Entry: what a request is before it is an invocation
// ---------------------------------------------------------------------------

/**
 * Why a request never became an invocation.
 *
 * Both arms precede the operation entirely, so neither may carry an operation
 * reference to something that was never invoked. `unrecognized` carries the
 * requested name as an opaque string precisely because it did not resolve — an
 * `OperationReference` here would assert the very thing that failed.
 */
export type WireRefusal = Algebra<{
  malformed: { readonly diagnostics: NonEmptyTuple<Diagnostic>; readonly path?: DataPath };
  unrecognized: { readonly requested: string };
}>;

/**
 * The boundary decision for one inbound request.
 *
 * Exact over the operation identity so that a wire admitting operation B cannot
 * substitute for one admitting operation A. The admitted arm carries a real
 * `OperationInvocation` from `00_core/07_operation` rather than a wire-shaped
 * copy of one: a second invocation vocabulary is a second reality, and the
 * repository already spent a target layer learning that a wrapper restating
 * what it wraps is not an abstraction.
 */
export type WireAdmission<Input = unknown, Op extends OperationId = OperationId> = Algebra<{
  admitted: { readonly invocation: OperationInvocation<Input, Op> };
  refused: { readonly refusal: WireRefusal };
}>;

// ---------------------------------------------------------------------------
// Exit: what happened to the answer
// ---------------------------------------------------------------------------

/**
 * One complete boundary crossing.
 *
 * Three arms, and the third is the one that earns the algebra.
 *
 * `refused` never reached an operation, so it carries no receipt — there is
 * nothing to have a receipt of.
 *
 * `undelivered` carries a receipt, because the operation *ran*. This is not a
 * failure of the operation and must never be reported as one. A caller that
 * treats an undelivered answer as a failure and retries without the idempotency
 * key executes it twice, and no amount of care at the call site recovers a
 * distinction the type threw away. Core already owns `IdempotencyKey`; the
 * wire's job is to not lose it.
 *
 * There is deliberately no `error` arm. An operation that refused or failed is
 * `completed` carrying a receipt whose outcome says so, because the crossing
 * succeeded — the answer is bad news, not a missing answer.
 */
export type WireExchange<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> = Algebra<{
  completed: { readonly receipt: OperationReceipt<Output, Failure, Op> };
  refused: { readonly refusal: WireRefusal };
  undelivered: {
    readonly receipt: OperationReceipt<Output, Failure, Op>;
    readonly idempotencyKey?: IdempotencyKey;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

// ---------------------------------------------------------------------------
// Catalogs and exposure
// ---------------------------------------------------------------------------

/**
 * What one wire exposes, and what it deliberately withholds.
 *
 * `withheld` is required and may be empty, the same shape assurance uses for a
 * gate's complement and for the same reason: a wire exposing a subset without
 * saying so reads downstream as exposing everything. An MCP or editor wire
 * exposing an allowed subset of system programs is ordinary and expected; an
 * MCP wire that silently exposes fewer than it appears to is a security
 * surface nobody audited.
 *
 * Non-empty exposure, because a wire that projects nothing is a wire nobody can
 * observe failing.
 */
export interface WireExposure {
  readonly exposed: NonEmptyTuple<OperationReference>;
  readonly withheld: readonly OperationReference[];
}

/**
 * One wire: its identity and what it projects.
 *
 * A wire declares no payload, context, handler, or hook table. Those names are
 * checked by a law, because the junk drawer arrives one convenient member at a
 * time and `02_targets` already recorded that removing the vendor's name from
 * the label does not make it constitutional.
 */
export interface WireDefinition<Id extends WireId = WireId> {
  readonly wire: WireReference<Id>;
  readonly exposure: WireExposure;
}

// ---------------------------------------------------------------------------
// Dogfooding
// ---------------------------------------------------------------------------

/**
 * Who is invoking through a wire.
 *
 * The arms are informational and carry no privilege. A system program crossing
 * the CLI wire takes the identical path an application operation takes, and
 * this type exists so that claim is checkable rather than promised: there is no
 * arm that unlocks anything, and the exposure, admission, and exchange types
 * are not parameterized by it.
 *
 * The alternative is the standard arrangement — a privileged internal engine
 * and a weaker public imitation — and the repository's dogfooding law exists
 * because that arrangement is how the public path stops being tested.
 */
export type WireCaller = Algebra<{
  application: Record<never, never>;
  systemProgram: Record<never, never>;
}>;

// The child topology was declared here and moved to `types.laws.ts`.
//
// It imported `DirectWireTypeSurface` so that the roster could not outlive the
// child it names -- a real property, bought at a price nobody priced. This file
// owns `WireExchange` and `WireRefusal`, which `direct/` imports, so importing
// `direct/` back closed a cycle:
//
//     02_wires/direct/types.ts -> 02_wires/types.ts -> 02_wires/direct/types.ts
//
// TypeScript accepted it, and the repository shipped it for as long as the
// wires umbrella has existed. `system/types.ts` does the same import and is
// fine, because it owns topology and nothing else and no system child imports
// it. The distinguishing property is not "parent" but "owns vocabulary the
// children consume".
//
// The topology keeps its teeth in its new home, which imports the child surface
// and is imported by nobody.

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------
