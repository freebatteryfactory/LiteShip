/**
 * Canonical encoding, digest, and immutable byte-identity contracts.
 *
 * This home owns portable representation. It does not decide persistent entity
 * identity, domain schemas, provenance, or durable storage.
 *
 * @module
 */

import type { Address, Algebra, Brand, Digest, Envelope, Port, Result } from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';

/** Finite portable value domain admitted for canonical encoding. */
export type CanonicalValue =
  | null
  | boolean
  | string
  | number
  | bigint
  | Uint8Array
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

/** Encoding formats owned or recognized by core. */
export type EncodingFormat = 'canonical-cbor' | 'canonical-json' | 'raw-bytes';

/** Cryptographic algorithms eligible for semantic and artifact integrity. */
export type HashAlgorithm = 'sha256' | 'blake3';

/** Compatibility-only checksum algorithms that never establish security authority. */
export type CompatibilityChecksumAlgorithm = 'fnv1a32';

/** Stable media/content type identity. */
export type MediaType = Brand<string, 'liteship.media-type'>;

/** Canonical bytes produced under one declared encoding. */
export type CanonicalBytes<Format extends EncodingFormat = EncodingFormat> = Brand<
  Uint8Array,
  readonly ['liteship.canonical-bytes', Format]
>;

/** Cryptographic digest over exact bytes. */
export type ContentDigest<Algorithm extends HashAlgorithm = HashAlgorithm> = Digest<Algorithm>;

/** Address of immutable content with the content type included in its identity. */
export type ContentAddress<
  Type extends string = string,
  Algorithm extends HashAlgorithm = 'sha256',
> = Address<`liteship.content:${Type}`, `${Algorithm}:${string}`>;

/** Why a value could not enter the portable canonical domain. */
export type CanonicalizationFailure = Algebra<{
  unsupported: { readonly valueType: string; readonly path: readonly (string | number)[] };
  cycle: { readonly path: readonly (string | number)[] };
  accessor: { readonly path: readonly (string | number)[] };
  nonfinite: { readonly value: number; readonly path: readonly (string | number)[] };
  duplicate: { readonly key: string; readonly path: readonly (string | number)[] };
}>;

/** Port whose encoded representation is canonical bytes. */
export interface CanonicalEncoding<Type, Format extends EncodingFormat = 'canonical-cbor'>
  extends Port<Type, CanonicalBytes<Format>> {
  readonly format: Format;
  readonly mediaType: MediaType;
}

/** Addressed encoded artifact. */
export type EncodedArtifact<
  Type extends string = string,
  Format extends EncodingFormat = EncodingFormat,
  Algorithm extends HashAlgorithm = 'sha256',
> = Envelope<
  'EncodedArtifact',
  1,
  {
    readonly mediaType: MediaType;
    readonly format: Format;
    readonly bytes: CanonicalBytes<Format>;
    readonly digest: ContentDigest<Algorithm>;
    readonly address: ContentAddress<Type, Algorithm>;
  }
>;

/** Result of canonical encoding. */
export type EncodeResult<Artifact = EncodedArtifact> = Result<Artifact, readonly Diagnostic[]>;

/** Type summary consumed by the root core topology. */
export interface EncodingTypeSurface {
  readonly value: CanonicalValue;
  readonly bytes: CanonicalBytes;
  readonly digest: ContentDigest;
  readonly address: ContentAddress;
  readonly artifact: EncodedArtifact;
  readonly failure: CanonicalizationFailure;
}
