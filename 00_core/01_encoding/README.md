# Canonical Encoding and Content Addressing

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_encoding/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Define the portable value domain, deterministic bytes, algorithm-labelled digests, immutable content addresses, and encoded artifacts used by every later semantic owner.

## Owns

- The canonical portable value algebra.
- Canonical encoding and decoding contracts.
- Media types and encoded artifacts.
- Algorithm-labelled digests and content addresses.
- Canonical normalization, ordering, and refusal rules.
- Integrity and identity relationships derived from one byte sequence.

## Does not own

- Persistent entity identity.
- Schema meaning or semantic admission.
- Host filesystems, databases, object stores, or network transports.
- TypeScript AST canonicalization.
- Provenance, authority, or attestation merely because content has an address.

## Semantic contracts

Canonical bytes identify exact immutable content. They do not identify a persistent subject, establish trust, or prove who produced the content.

Every encoded artifact composes the root `Envelope` operator so the body cannot shadow `_tag` or `_version`. Algorithms remain explicit in the representation. Raw source text is never used as semantic Type ABI identity.

## Laws

- Equal admitted portable values encode to byte-identical output under one encoding version.
- Object order, locale, whitespace, comments, and allocation identity do not alter semantic bytes.
- Unsupported values refuse rather than stringify or coerce.
- Identity and integrity digests over one object derive from the same canonical byte sequence.
- Digest algorithm identity is part of the digest value.
- Unknown envelope or encoding versions fail closed.
- A content address is not an entity ID, attestation, trace, or receipt.

## Operation vocabulary

- `encode` converts a portable admitted value into canonical bytes.
- `decode` converts encoded bytes into the portable value domain.
- `digest` computes an algorithm-labelled digest.
- `address` derives immutable content identity.
- `inspect` reports encoding, algorithm, media type, and byte length.

## Proof obligations

- Cross-runtime golden vectors for every canonical value kind.
- Key-order, numeric, byte-string, and undefined-policy determinism.
- Unsupported functions, accessors, cycles, symbols, and host objects refuse without executing user code.
- Same-byte identity and integrity calculations cannot diverge.
- Unknown versions and algorithms refuse.
- TypeScript and Rust implementations produce byte-identical vectors where both exist.

## Implementation boundary

The semantic contract is specified. Runtime implementation and algorithm defaults are absent. The default cryptographic digest is selected through interoperability and performance evidence without changing the algorithm-agile type surface.

Qualifying the canonical encoding, digest algorithms, streaming encoders where earned, and the cross-language golden corpus are implementation obligations this architecture already authorizes.
