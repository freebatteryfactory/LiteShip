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
  Assert,
  Brand,
  CaseOf,
  DataPath,
  Equal,
  NonEmptyTuple,
  Reference,
  TagOf,
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

export type WireId<Name extends string = string> = Brand<Name, 'liteship.wire-id'>;
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

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type WireLawA = OperationId<'liteship.wire.law.op-a'>;
type WireLawB = OperationId<'liteship.wire.law.op-b'>;

/**
 * A refused crossing has no receipt; an undelivered one does.
 *
 * This is the central claim of the home. Line three is the one that matters
 * most in practice: if `undelivered` ever loses its receipt, the fact that the
 * operation ran becomes unrepresentable and every consumer that retries is
 * silently wrong.
 */
export type ARefusalHasNoReceiptAndAnUndeliveredAnswerDoes = Assert<
  Equal<
    [
      'receipt' extends keyof CaseOf<WireExchange, 'refused'> ? true : false,
      'receipt' extends keyof CaseOf<WireExchange, 'completed'> ? true : false,
      'receipt' extends keyof CaseOf<WireExchange, 'undelivered'> ? true : false,
      'invocation' extends keyof CaseOf<WireExchange, 'refused'> ? true : false,
      Equal<TagOf<WireExchange>, 'completed' | 'refused' | 'undelivered'>,
    ],
    [false, true, true, false, true]
  >
>;

/**
 * A wire failure channel is not an operation failure channel.
 *
 * `WireRefusal` has no arm carrying an operation outcome, and `WireExchange`
 * has no `error` arm. An operation that refused or failed arrives as
 * `completed` with a receipt saying so, because the crossing worked. Merging
 * the two is how a transport error becomes indistinguishable from a business
 * refusal.
 */
export type ARefusalIsNotAnOperationFailure = Assert<
  Equal<
    [
      Equal<TagOf<WireRefusal>, 'malformed' | 'unrecognized'>,
      'failed' extends TagOf<WireRefusal> ? true : false,
      'error' extends TagOf<WireExchange> ? true : false,
      'outcome' extends keyof CaseOf<WireExchange, 'refused'> ? true : false,
      Equal<CaseOf<WireRefusal, 'unrecognized'>['requested'], string>,
    ],
    [true, false, false, false, true]
  >
>;

/**
 * Admission and exchange are exact over the operation.
 *
 * The third and sixth lines are the anti-vacuity partners. Without them the
 * laws pass when the carriers drop the parameter, which is this repository's
 * signature defect and has now been committed often enough to be checked by
 * reflex.
 */
export type AWireIsExactOverTheOperationItProjects = Assert<
  Equal<
    [
      WireAdmission<unknown, WireLawA> extends WireAdmission<unknown, WireLawB> ? true : false,
      WireAdmission<unknown, WireLawA> extends WireAdmission<unknown, WireLawA> ? true : false,
      WireAdmission extends WireAdmission<unknown, WireLawA> ? true : false,
      WireExchange<unknown, never, WireLawA> extends WireExchange<unknown, never, WireLawB>
        ? true
        : false,
      WireExchange<unknown, never, WireLawA> extends WireExchange<unknown, never, WireLawA>
        ? true
        : false,
      WireExchange extends WireExchange<unknown, never, WireLawA> ? true : false,
    ],
    [false, true, false, false, true, false]
  >
>;

/**
 * A wire declares no operation semantics.
 *
 * Checked by name, because every one of these is a plausible-looking addition
 * that would move meaning across the boundary into the transport. A wire that
 * owns a handler is a second place where behaviour lives.
 */
export type AWireCarriesNoOperationSemantics = Assert<
  Equal<
    [
      'payload' extends keyof WireDefinition ? true : false,
      'context' extends keyof WireDefinition ? true : false,
      'hooks' extends keyof WireDefinition ? true : false,
      'handler' extends keyof WireDefinition ? true : false,
      'middleware' extends keyof WireDefinition ? true : false,
      'schema' extends keyof WireDefinition ? true : false,
    ],
    [false, false, false, false, false, false]
  >
>;

/**
 * Exposure states its complement, and the caller unlocks nothing.
 *
 * The last two lines are the dogfooding proof: neither the exposure nor the
 * admission type is parameterized by who is calling, so there is no shape in
 * which a system program travels a path an application cannot.
 */
export type ExposureIsStatedAndTheCallerIsNotPrivileged = Assert<
  Equal<
    [
      Equal<WireExposure['exposed'], NonEmptyTuple<OperationReference>>,
      Equal<WireExposure['withheld'], readonly OperationReference[]>,
      undefined extends WireExposure['withheld'] ? true : false,
      Equal<Exclude<keyof CaseOf<WireCaller, 'systemProgram'>, '_tag'>, never>,
      Equal<Exclude<keyof CaseOf<WireCaller, 'application'>, '_tag'>, never>,
    ],
    [true, true, false, true, true]
  >
>;

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

/** Type summary consumed by the root topology. */
export interface WireTypeSurface {
  readonly wire: WireReference;
  readonly definition: WireDefinition;
  readonly exposure: WireExposure;
  readonly refusal: WireRefusal;
  readonly admission: WireAdmission;
  readonly exchange: WireExchange;
  readonly caller: WireCaller;
}
