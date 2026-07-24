# ADR-0003 — Content addressing via FNV-1a + CBOR

**Status:** Accepted
**Date:** 2026-04-21
**Audience:** Contributors who add a new primitive that needs identity, or who change how identity is hashed. Read it if your code computes a `ContentAddress`.

## Context

LiteShip primitives (Boundaries, Quantizer configs, Receipts, GenFrames, Tokens, Themes) need a stable, compact definition label that tracks definition changes. Local caching (HMR memoization and compositor reconciliation) depends on being able to ask "is this definition the same one I already processed?" without structural walks. The same definition on two different machines (dev laptop and edge worker) must produce the same label. Changing any identity-bearing field of a definition must change the label.

## Decision

The local definition label is `fnv1a:XXXXXXXX`: a 32-bit FNV-1a hash of the CBOR-canonical serialization of the payload, wrapped in the branded `ContentAddress` type (see ADR-0001). It is not a cryptographic identity or trust witness. Security-sensitive, external-artifact, attacker-influenced cache, wire-validation, and release-evidence paths must carry an `IntegrityDigest` or the paired `AddressedDigest` over the same authoritative bytes (see ADR-0011 and `addressed-digest.ts`).

Host-only executable closures are outside the portable label because functions have no canonical cross-machine byte form. For example, `BoundarySpec.deviceFilter` remains on the host boundary object, while the portable label and DOM wire include only `timeRange` and `experimentId`. Changing portable activation semantics changes the label; changing a host closure changes host behavior without pretending that closure has portable bytes.

## Consequences

- **Deterministic and cross-machine stable.** CBOR normalizes key ordering, integer canonicalization, and floating-point representation; two machines produce the same bytes, therefore the same hash.
- **Cheap to compute.** FNV-1a via `Math.imul` for 32-bit hashing (`packages/canonical/src/fnv.ts`, re-exported through `packages/core/src/evidence/fnv.ts`). Suitable for per-definition use throughout the build pipeline without measurable overhead.
- **Collision probability at 32 bits is ~1 in 4B.** Acceptable for content-identity within a single app; not cryptographic. SHA-256 via `packages/core/src/evidence/typed-ref.ts` covers signature-grade needs.
- **Automatic cache invalidation.** Hash-indexed caches (`quantizer/src/memo-cache.ts`) invalidate correctly on any change to the addressed definition. _(Amended 0.3.0: when a cached VALUE also depends on inputs OUTSIDE the addressed definition — a per-request theme, or a bundled `compile`'s build-time content — those inputs must be folded into the cache key or a per-deploy content-version `prefix`, or the key survives a change to them. The edge boundary cache now folds tier + name + a resolved-theme fingerprint; `prefix` is the content version. See [ADR-0017](./0017-cache-content-version.md) and HOSTING.md §KV trust boundary.)_
- **Reliable non-adversarial projection labels.** The same addressed definition on different machines produces the same label. Edge/CDN trust and external artifact validation additionally require the integrity rules above and the complete cache key described by ADR-0017.

## Evidence

- `packages/canonical/src/cbor.ts`, `packages/canonical/src/fnv.ts`: FNV-1a and canonical CBOR (implementation kernel).
- `packages/core/src/schema/cbor.ts`, `packages/core/src/evidence/fnv.ts`: domain-owned re-export shims re-anchored to spine brands.
- `packages/canonical/src/addressed-digest.ts`: sync SHA-256 / BLAKE3 integrity digests (`@noble/hashes`).
- `packages/core/src/evidence/typed-ref.ts`: SHA-256 content hashing for typed references (receipt law).
- `packages/quantizer/src/memo-cache.ts`: hash-indexed cache consumer.
- Used by Boundary, Token, Style, Theme, Receipt, and GenFrame (see their domain-owned `define*` constructors and evidence/media owners).
- `tests/property/content-address.prop.test.ts`: fast-check property test verifying hash stability across structurally-equivalent inputs.

## Rejected alternatives

- **SHA-256 for all identity**: overkill and measurably slower for non-cryptographic identity; reserved for signature-grade needs.
- **`JSON.stringify`**: key-order nondeterminism across engines; unusable for cross-machine identity.
- **Structural equality**: no stable identifier, no cache key, no edge-cacheable output.

## References

- `packages/core/src/evidence/fnv.ts`: hashing projection
- `packages/core/src/schema/brands.ts`: `ContentAddress` brand
- `packages/core/src/evidence/typed-ref.ts`: SHA-256 path
- `packages/core/src/evidence/receipt.ts`, `packages/core/src/media/gen-frame.ts`: consumers
- `tests/property/content-address.prop.test.ts`: stability property test
- ADR-0001: branded types

## Implementation status (2026-04-24)

Content addressing routes through `CanonicalCbor.encode` (RFC 8949
§4.2.1 canonical form): map keys lex-sorted by encoded byte order,
shortest-form integer encoding, definite-length arrays/maps, integer
form preferred over float when value is representable. The byte
output feeds into `fnv1aBytes` to produce the `ContentAddress` brand.

Previously the implementation used `JSON.stringify` for the payload
serialization, which was key-order dependent and platform-quirk
sensitive. Stabilizing on canonical CBOR closes that drift.

The encoder lives at `packages/canonical/src/cbor.ts` (published as
`@liteship/canonical`) and is re-exported from `packages/core/src/schema/cbor.ts`.
It is registered as the `core.canonical-cbor` `pureTransform` arm capsule
(`packages/core/src/authoring/capsules/canonical-cbor.ts`). It runs under
property-based tests over RFC 8949 Appendix A vectors plus key-order
stability and integer-form preference (`tests/unit/canonical/cbor.test.ts`,
`tests/generated/core-canonical-cbor.test.ts`).

The capsule factory's own `computeId` (`packages/core/src/authoring/assembly.ts`)
is the canonical example: it CBOR-encodes the contract's
identity-bearing fields then hashes with `fnv1aBytes`, so even the
catalog that defines the 7 arms uses the canonical content-address
path it advertises.

CLI idempotency (`packages/cli/src/idempotency.ts`) routes through
the same encoder so `liteship` command receipts remain stable across
key-order permutations on disk.

## Two byte laws (2026-05-27, CUT typed-ref)

There are intentionally **two** canonical byte laws, and they are not
interchangeable:

- **Identity (`fnv1a:`):** `CanonicalCbor` governs all internal
  `fnv1a:` content addresses. Always-float64 (it normalizes float
  width) because identity needs **cross-payload agreement** — two
  structurally-equal payloads must mint the same address.
- **Receipt/mutation (`sha256:`):** the SHA-256 chains
  (`TypedRef.canonicalize` in `packages/core/src/evidence/typed-ref.ts`, consumed by
  `packages/core/src/evidence/receipt.ts` and `packages/core/src/reactive/live-cell.ts`) use a separate, `cborg`-backed
  deterministic-CBOR byte law. `cborg` uses smallest-float canonical
  form; that is acceptable here because a receipt chain only ever
  compares its own `cborg→sha256` bytes against its own — it never
  cross-compares the two encoders. The encoder is deliberately _not_
  migrated to `CanonicalCbor`: doing so would invalidate persisted
  sha256 receipts for no correctness gain, and `cborg` is required for
  decode regardless (`CanonicalCbor` is encode-only).

The two are guarded distinct in
`tests/unit/core/canonical-identity.test.ts` (fnv1a never mints
through cborg/`TypedRef.canonicalize`) and
`tests/unit/core/receipt-byte-law.test.ts` (the receipt law stays
cborg-backed and the float divergence is pinned as intentional).
So the "floating-point representation" normalization noted above
applies to the **identity** law specifically, not to the receipt law.
