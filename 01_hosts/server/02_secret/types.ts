/**
 * Secrets: opaque references, scoped revelation, honest disposal.
 *
 * This home owns secret-provider authority: opaque secret references that
 * never carry material, scoped and identity-correlated revelation, rotation
 * and revocation evidence, and redaction discipline. Raw secret material
 * never enters broad contexts, the Type ABI, logs, addresses, or receipts —
 * a revealed secret is a per-use owned resource with no serialization
 * surface, disposed exactly once.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { GroundingId, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';

export type SecretId<Name extends string = string> = Brand<Name, 'liteship.server.secret-id'>;
/** Revealed material: branded, deliberately outside every canonical encoding path. */
export type SecretMaterial = Brand<Uint8Array, 'liteship.server.secret-material'>;

/**
 * The one boundary where material appears: a consumer admitted for exactly
 * one secret. The material is the consumer's input — never a field on the
 * revelation, never in a broad context, never in a receipt.
 */
export interface SecretConsumer<Id extends SecretId> {
  readonly reveals: SecretScopedReference<Id>;
  readonly consume: Signature<SecretMaterial, SecretUseReceipt<Id>, NonEmptyTuple<Diagnostic>>;
}

/** Proof one use happened, naming the exact secret — carrying no material. */
export interface SecretUseReceipt<Id extends SecretId> {
  readonly reveals: SecretScopedReference<Id>;
  readonly address: ContentAddress<'application/vnd.liteship.server-secret-use+cbor'>;
}
export type SecretScopedReference<Id extends SecretId = SecretId> = Reference<'server-secret', Id>;

/** Rotation and revocation evidence for one secret. */
export type SecretDisposition = Algebra<{
  current: Record<never, never>;
  rotated: Record<never, never>;
  revoked: Record<never, never>;
}>;

/**
 * One revealed secret: generic over the exact secret identity it reveals —
 * revealing secret A yields a revelation of A, provably not of B. It has
 * exactly three members: the identity, the scoped `use` operation, and the
 * disposal. Material never appears as a field: it exists only as the input
 * of an admitted consumer for exactly this secret, so broad contexts,
 * receipts, logs, and object traversal have nothing to reach. That runtime
 * code explicitly admitted into the consumer boundary can still leak what
 * it is given remains the standing assurance obligation.
 */
export interface RevealedSecret<Id extends SecretId> {
  readonly reveals: SecretScopedReference<Id>;
  readonly use: Signature<SecretConsumer<Id>, SecretUseReceipt<Id>, NonEmptyTuple<Diagnostic>>;
  readonly dispose: Signature<SecretScopedReference<Id>, SecretScopedReference<Id>, NonEmptyTuple<Diagnostic>>;
}

/**
 * The secret provider: resolution is identity-correlated, and disposition is
 * observable without revelation.
 */
export interface SecretProvider {
  readonly resolve: <Id extends SecretId>(
    reference: SecretScopedReference<Id>,
  ) => Result<RevealedSecret<Id>, NonEmptyTuple<Diagnostic>>;
  readonly disposition: Signature<SecretScopedReference, SecretDisposition, NonEmptyTuple<Diagnostic>>;
}

/** The admitted deployment source beneath the provider. */
export interface SecretSourceBinding {
  readonly admitted: true;
}

export type SecretSourceRequirement = Hole<'liteship.server.secret-source', SecretSourceBinding>;
export type SecretProviderRequirement = Hole<'liteship.server.secrets', SecretProvider>;

/** Deployment grounding: the secret source enters admitted. */
export interface SecretSourceGrounding
  extends ServerGroundingDefinition<
    readonly [SecretSourceRequirement],
    SecretSourceBinding,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.secret-source'>;
}

/** Constructing the secret provider. */
export interface SecretProviderOffer
  extends ServerRealizationOffer<
    readonly [SecretProviderRequirement],
    readonly [SecretSourceRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.secret-provider'>;
  readonly locations: NonEmptyTuple<'local'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the server topology. */
export interface ServerSecretTypeSurface {
  readonly reference: SecretScopedReference;
  readonly consumer: SecretConsumer<SecretId>;
  readonly useReceipt: SecretUseReceipt<SecretId>;
  readonly revealed: RevealedSecret<SecretId>;
  readonly provider: SecretProvider;
  readonly sourceGrounding: SecretSourceGrounding;
  readonly secretOffer: SecretProviderOffer;
}
