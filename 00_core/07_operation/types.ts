/**
 * Protocol-neutral operation contracts, delegated authority, and approval.
 *
 * An operation is an invocable unit of power. Its input, output, failure,
 * requirements, business effect, cancellation, idempotency, and authority are
 * explicit before any direct, HTTP, CLI, MCP, or editor wire projects it.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  CaseOf,
  NonEmptyTuple,
  Reference,
  RequirementRow,
  Result,
  Signature,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { AttestationId, EntityReference, ReceiptId, RevisionReference, WorldReference } from '../02_identity/types.js';
import type { EntityFieldReference, SchemaId, SchemaReference } from '../03_schema/types.js';
import type { TimeCoordinate } from '../04_time/types.js';
import type { Deadline } from '../05_lifecycle/types.js';
import type { EvidenceAuthority } from '../06_evidence/types.js';

/** Stable identity for one operation. */
export type OperationId<Name extends string = string> = Brand<Name, 'liteship.operation-id'>;
/** Typed reference to one operation. */
export type OperationReference<Id extends OperationId = OperationId> = Reference<'operation', Id>;
/** Stable identity for one actor. */
export type ActorId = Brand<string, 'liteship.actor-id'>;
/** Stable identity for one workload. */
export type WorkloadId = Brand<string, 'liteship.workload-id'>;
/** Stable identity for one client. */
export type ClientId = Brand<string, 'liteship.client-id'>;
/** Stable identity for one delegate. */
export type DelegateId = Brand<string, 'liteship.delegate-id'>;
/** Type-level representation of business effect. */
export type BusinessEffect = Brand<string, 'liteship.business-effect'>;
/** Type-level representation of purpose code. */
export type PurposeCode = Brand<string, 'liteship.purpose-code'>;
/** Type-level representation of idempotency key. */
export type IdempotencyKey = Brand<string, 'liteship.idempotency-key'>;
/** Stable identity for one policy. */
export type PolicyId = Brand<string, 'liteship.policy-id'>;

/** Coarse effect class used for policy and explanation. */
export type EffectClass = 'observe' | 'create' | 'modify' | 'delete' | 'publish' | 'execute' | 'transfer';

/** Independent operation-resource limits. Rate, quota, cost, and work are not one number. */
export interface ResourceLimits {
  readonly rate?: { readonly maximum: number; readonly windowMilliseconds: number };
  readonly quota?: { readonly maximum: number; readonly windowMilliseconds?: number };
  readonly concurrency?: { readonly maximum: number };
  readonly requestBytes?: { readonly maximum: number };
  readonly responseBytes?: { readonly maximum: number };
  readonly duration?: { readonly maximumMilliseconds: number };
  readonly fanout?: { readonly maximum: number };
  readonly cost?: { readonly currency: string; readonly maximum: number };
  readonly steps?: { readonly maximum: number };
  readonly tokens?: { readonly maximum: number };
}

type RequireAtLeastOne<Value extends object> = {
  readonly [Key in keyof Value]-?: Required<Pick<Value, Key>> & Partial<Omit<Value, Key>>;
}[keyof Value];

/** Effective bounded resource authority with at least one uniquely named limit. */
export type ResourceBudget = Readonly<RequireAtLeastOne<ResourceLimits>>;

/** Resource or capability whose authority is being exercised. */
export type AuthorityTarget = Algebra<{
  entity: { readonly entity: EntityReference };
  world: { readonly world: WorldReference };
  field: EntityFieldReference;
  operation: { readonly operation: OperationReference };
}>;

/** Authority the operation definition requires an invocation to present. */
export interface AuthorityRequirement {
  readonly target: 'operation' | 'input-derived' | AuthorityTarget;
  readonly effects: NonEmptyTuple<BusinessEffect>;
  readonly purpose: 'optional' | 'required' | readonly PurposeCode[];
  readonly minimumEvidenceAuthority: EvidenceAuthority;
  readonly furtherDelegationAllowed: boolean;
}

/** Invocation identities remain distinct instead of collapsing into one token subject. */
export interface InvocationIdentity {
  readonly subject?: EntityReference;
  readonly actor: ActorId;
  readonly workload?: WorkloadId;
  readonly client?: ClientId;
  readonly delegate?: DelegateId;
}

/** Delegated authority for a consequential operation. */
export interface DelegatedAuthority {
  readonly target: AuthorityTarget;
  readonly effects: NonEmptyTuple<BusinessEffect>;
  readonly purpose?: PurposeCode;
  readonly expiresAt?: TimeCoordinate;
  readonly furtherDelegation: boolean;
  readonly evidenceAuthority: EvidenceAuthority;
  readonly budget?: ResourceBudget;
  readonly attestation?: AttestationId;
}

/** Replay and duplicate handling. */
export type IdempotencyPolicy = Algebra<{
  none: Record<never, never>;
  natural: Record<never, never>;
  keyed: { readonly scope: 'operation' | 'subject' | 'resource'; readonly window?: TimeCoordinate };
}>;

/** Approval required after operation policy evaluates effects and authority. */
export type ApprovalRequirement = Algebra<{
  none: Record<never, never>;
  human: { readonly approvers: number };
  independent: { readonly approvers: number; readonly separationOfDuties: true };
}>;

/**
 * Policy disposition keeps authorization, pending approval, and denial
 * structurally distinct. Approval is a requirement only on the two arms that
 * can lawfully carry one; denial explains itself with non-empty diagnostics.
 */
export type OperationPolicyDisposition = Algebra<{
  allowed: {
    readonly approval: CaseOf<ApprovalRequirement, 'none'>;
    readonly diagnostics: readonly Diagnostic[];
  };
  'approval-required': {
    readonly approval:
      | CaseOf<ApprovalRequirement, 'human'>
      | CaseOf<ApprovalRequirement, 'independent'>;
    readonly diagnostics: readonly Diagnostic[];
  };
  denied: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * Definition of one protocol-neutral operation. The trailing identity
 * parameter lets a host prove that a definition, its invocations, its
 * handler, and its receipts all refer to one exact operation — the broad
 * default exists only for erased populations; governed handler construction
 * threads the exact identity.
 */
export interface OperationDefinition<
  Input,
  Output,
  Failure,
  Requirements extends RequirementRow = readonly [],
  Op extends OperationId = OperationId,
> {
  readonly id: Op;
  readonly signature: Signature<Input, Output, Failure, Requirements>;
  readonly inputSchema: SchemaReference<SchemaId, Input>;
  readonly outputSchema: SchemaReference<SchemaId, Output>;
  readonly failureSchema: SchemaReference<SchemaId, Failure>;
  readonly effects: NonEmptyTuple<EffectClass>;
  readonly businessEffects: NonEmptyTuple<BusinessEffect>;
  readonly idempotency: IdempotencyPolicy;
  readonly cancellable: boolean;
  readonly requirements: Requirements;
  readonly authority?: AuthorityRequirement;
  readonly budget?: ResourceBudget;
  readonly reversible: boolean;
}

/** One invocation independent of transport, naming its exact operation. */
export interface OperationInvocation<Input = unknown, Op extends OperationId = OperationId> {
  readonly operation: OperationReference<Op>;
  readonly identity: InvocationIdentity;
  readonly input: Input;
  readonly idempotencyKey?: IdempotencyKey;
  readonly expectedRevision?: RevisionReference;
  readonly deadline?: Deadline;
  readonly authority?: DelegatedAuthority;
  readonly requestedBudget?: ResourceBudget;
}

/** Policy result derived from the operation, invocation, authority, and context. */
export interface OperationPolicyDecision<Op extends OperationId = OperationId> {
  readonly operation: OperationReference<Op>;
  readonly policy: PolicyId;
  readonly disposition: OperationPolicyDisposition;
  readonly effectiveBudget?: ResourceBudget;
  readonly attestation?: AttestationId;
}

/** Closed operation outcome. */
export type OperationOutcome<Output = unknown, Failure = readonly Diagnostic[]> = Algebra<{
  succeeded: { readonly output: Output };
  failed: { readonly error: Failure };
  refused: { readonly diagnostics: readonly Diagnostic[] };
  cancelled: { readonly diagnostics: readonly Diagnostic[] };
}>;

/** Acknowledged outcome. Receipt remains narrower than provenance or tracing. */
export interface OperationReceipt<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> {
  readonly id: ReceiptId;
  readonly invocation: OperationInvocation<unknown, Op>;
  readonly policy?: OperationPolicyDecision<Op>;
  readonly outcome: OperationOutcome<Output, Failure>;
  readonly resultingRevision?: RevisionReference;
}

/** Handler result before a wire projects it. */
export type OperationResult<Output, Failure> = Result<Output, Failure | readonly Diagnostic[]>;

/** Type summary consumed by the root core topology. */
export interface OperationTypeSurface {
  readonly definition: OperationDefinition<unknown, unknown, unknown>;
  readonly invocation: OperationInvocation;
  readonly policy: OperationPolicyDecision;
  readonly policyDisposition: OperationPolicyDisposition;
  readonly approval: ApprovalRequirement;
  readonly outcome: OperationOutcome;
  readonly receipt: OperationReceipt;
  readonly authority: DelegatedAuthority;
  readonly authorityRequirement: AuthorityRequirement;
  readonly budget: ResourceBudget;
  readonly resourceLimits: ResourceLimits;
}
