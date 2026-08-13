/**
 * Canonical encoding, digest, and immutable byte-identity contracts.
 *
 * This home owns portable representation. It does not decide persistent entity
 * identity, domain schemas, provenance, or durable storage.
 *
 * @module
 */

import type { Address, Algebra, Assert, Brand, Digest, Envelope, Equal, Port, Result } from '../../types.js';
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

/** The registered top-level media type families, per RFC 6838. */
export type MediaTypeFamily =
  | 'application'
  | 'audio'
  | 'font'
  | 'image'
  | 'message'
  | 'model'
  | 'multipart'
  | 'text'
  | 'video';

/** Characters a subtype may begin with. Alphanumeric, per RFC 6838 §4.2. */
type MediaTypeSubtypeStart =
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm'
  | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/**
 * Compile-time grammar for a content type.
 *
 * This is the syntax, not the roster. It admits any registered family followed
 * by a non-empty subtype, so a lawful external type needs no architecture edit
 * to be addressable — `image/png`, `application/wasm`, `text/css`,
 * `font/woff2`, and `model/gltf+json` all satisfy it today without appearing
 * anywhere in this repository.
 *
 * What it rejects is malformation. A misspelled family (`applicaton/…`), a
 * missing slash, an empty subtype, and bare `string` are all excluded. That
 * last exclusion is the point: `ContentAddress<Type extends string>` accepted
 * every spelling, so `ContentAddress<'applicaton/vnd.liteship.revision+cbor'>`
 * compiled and minted an address type that would never unify with the correctly
 * spelled one, silently, forever. There are a hundred and seven of these
 * literals in the tree and nothing was checking any of them.
 *
 * Deliberately not a closed union of the observed hundred and seven. That would
 * make every new lawful media type an architecture edit, which is the
 * hand-maintained-roster shape this repository keeps removing.
 *
 * Also deliberately not a full RFC 6838 parser. Parameters (`; charset=utf-8`),
 * suffix structure (`+cbor`), and codec detail are richer facts than a
 * MIME-shaped string can carry honestly; when they are needed they belong in a
 * representation profile owned by whoever knows them, not smuggled into an
 * identity axis.
 */
export type MediaTypeSyntax = `${MediaTypeFamily}/${MediaTypeSubtypeStart}${string}`;

/**
 * Stable media/content type identity, as an admitted runtime value.
 *
 * Distinct from {@link MediaTypeSyntax}, and the distinction is load-bearing.
 * The syntax is a compile-time constraint on a type parameter. This is a
 * nominal brand over a value, minted by whoever validated it — a raw string
 * cannot inhabit it, which is the brand working, not a defect. The carrier is
 * now the syntax rather than bare `string`, so an admitted media type is also a
 * well-formed one.
 */
export type MediaType = Brand<MediaTypeSyntax, 'liteship.media-type'>;

/** Canonical bytes produced under one declared encoding. */
export type CanonicalBytes<Format extends EncodingFormat = EncodingFormat> = Brand<
  Uint8Array,
  readonly ['liteship.canonical-bytes', Format]
>;

/** Cryptographic digest over exact bytes. */
export type ContentDigest<Algorithm extends HashAlgorithm = HashAlgorithm> = Digest<Algorithm>;

/** Address of immutable content with the content type included in its identity. */
export type ContentAddress<
  Type extends MediaTypeSyntax = MediaTypeSyntax,
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
  Type extends MediaTypeSyntax = MediaTypeSyntax,
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

/**
 * The content-type grammar admits lawful types and rejects malformed ones.
 *
 * Both halves matter. A grammar that rejected everything would satisfy every
 * negative fixture and make the repository unable to address a PNG; a grammar
 * that accepted everything is what `Type extends string` already was.
 *
 * The lawful side deliberately includes types that appear nowhere in this
 * repository. `image/png`, `application/wasm`, `text/css`, `font/woff2`, and
 * `model/gltf+json` are all addressable today without an architecture edit,
 * which is the difference between a syntax and a roster.
 *
 * The last negative is the one that was live: bare `string`. Every one of the
 * hundred and seven vendor literals in this tree was an unchecked spelling, so
 * a transposed letter minted an address type that would never unify with the
 * correct one and nothing could notice.
 */
export type TheContentTypeGrammarAdmitsLawfulTypesAndRejectsMalformedOnes = Assert<
  Equal<
    [
      'application/vnd.liteship.revision+cbor' extends MediaTypeSyntax ? true : false,
      'application/vnd.liteship.source-map+json' extends MediaTypeSyntax ? true : false,
      'image/png' extends MediaTypeSyntax ? true : false,
      'application/wasm' extends MediaTypeSyntax ? true : false,
      'text/css' extends MediaTypeSyntax ? true : false,
      'font/woff2' extends MediaTypeSyntax ? true : false,
      'model/gltf+json' extends MediaTypeSyntax ? true : false,
      'applicaton/vnd.liteship.revision+cbor' extends MediaTypeSyntax ? true : false,
      'vnd.liteship.revision+cbor' extends MediaTypeSyntax ? true : false,
      'application/' extends MediaTypeSyntax ? true : false,
      string extends MediaTypeSyntax ? true : false,
    ],
    [true, true, true, true, true, true, true, false, false, false, false]
  >
>;

/**
 * An admitted media type is not a raw string, in either direction.
 *
 * The brand is the runtime half of the split: a validated value minted by its
 * owner. A literal cannot inhabit it — that is the brand doing its job, not a
 * defect to be relaxed — and the carrier is the syntax, so an admitted type is
 * also a well-formed one.
 */
export type AnAdmittedMediaTypeIsNotARawString = Assert<
  Equal<
    [
      'image/png' extends MediaType ? true : false,
      MediaType extends MediaTypeSyntax ? true : false,
      MediaTypeSyntax extends MediaType ? true : false,
    ],
    [false, true, false]
  >
>;

/** Type summary consumed by the root core topology. */
export interface EncodingTypeSurface {
  readonly value: CanonicalValue;
  readonly bytes: CanonicalBytes;
  readonly digest: ContentDigest;
  readonly address: ContentAddress;
  readonly artifact: EncodedArtifact;
  readonly failure: CanonicalizationFailure;
}
