# ADR-0013 — `@czap/canonical` self-contained bytes kernel

**Status:** Accepted  
**Date:** 2026-06-12  
**Audience:** Contributors who need stable canonical bytes without pulling the full `@czap/core` graph.

## Context

Content addressing (ADR-0003) depends on three cooperating pieces: RFC 8949 §4.2.1 canonical CBOR encoding, FNV-1a display labels, and optional sync integrity digests (`AddressedDigest`). These lived inside `@czap/core`, which carries Effect peers, spine re-anchors, and the full primitive surface. CLI tools, quantizer tests, and future lightweight consumers need the same bytes law without that weight.

The prior `AddressedDigest.of` implementation used Effect and async `crypto.subtle`, which blocked sync call sites (ship manifest, capsule identity) from staying pure.

## Decision

- Extract a new publishable package `@czap/canonical` at `packages/canonical/`.
- **Sole runtime dependency:** `@noble/hashes` (sync SHA-256 and BLAKE3).
- **No peer dependencies.** No `@czap/_spine`, `@czap/core`, or Effect imports inside the package.
- Local brand types (`ContentAddress`, `IntegrityDigest`, `AddressedDigest`) live in-package and remain byte-compatible with spine/core.
- `@czap/core` re-exports the kernel (`CanonicalCbor`, `fnv1a`, `fnv1aBytes`, `AddressedDigest.of`) and re-anchors exported types to `@czap/_spine` at its export boundary (ADR-0010 pattern in `packages/core/src/brands.ts` and `addressed-digest.ts`).
- Golden-vector tests pin encoder and digest output under `tests/unit/canonical/`.

## Consequences

- Any consumer can import stable bytes with minimal dependency surface.
- `AddressedDigest.of` is synchronous everywhere; ship and capsule paths no longer `yield*` through Effect for digest minting.
- Type brands stay spine-canonical for public `@czap/core` exports; `@czap/canonical` is the implementation source, not a second public type system.
- Changing encoder or noble wiring breaks golden vectors — that is intentional.

## Evidence

- `packages/canonical/src/` — encoder, FNV, sync digests, local brands.
- `packages/core/src/cbor.ts`, `fnv.ts`, `addressed-digest.ts` — re-export shims.
- `tests/unit/canonical/golden-vectors.test.ts` — pinned bytes and digests.
- `tests/unit/canonical/core-shim-conformance.test.ts` — core vs canonical parity.

## References

- ADR-0003 — content addressing via FNV-1a + CBOR
- ADR-0010 — spine as canonical type source (core re-anchor boundary)
- ADR-0011 — ship capsule integrity (`AddressedDigest` consumer)
