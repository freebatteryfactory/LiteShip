# @czap/canonical

The sync bytes kernel — deterministic CBOR encoding, FNV-1a content labels, and addressed digests, with no Effect runtime and no `@czap/core` graph behind it.

> You usually don't install this directly — `@czap/core` re-exports these surfaces at its public boundary, so app authors who already depend on core get them for free. Reach for `@czap/canonical` standalone only when core is too heavy: an upstream factory or WASM-side path that needs stable bytes without pulling the full graph.

## Install

```bash
pnpm add @czap/core # brings @czap/canonical with it
```

If you do need the kernel standalone, install it directly: `pnpm add @czap/canonical`. Its only third-party dependency is `@noble/hashes` (for the sha256/blake3 digests) — no Effect, no peer setup.

## 30 seconds

```ts
import { CanonicalCbor, AddressedDigest, fnv1a } from '@czap/canonical';

// Key-permuted objects encode to byte-identical output (RFC 8949 §4.2.1).
const bytes = CanonicalCbor.encode({ title: 'hello', n: 42 });

const digest = AddressedDigest.of(bytes);
console.log(digest.display_id);       // 'fnv1a:xxxxxxxx' — sync identity label
console.log(digest.integrity_digest); // 'sha256:...'      — cryptographic digest
console.log(digest.algo);             // 'sha256' (pass 'blake3' for the blake3 digest)

console.log(fnv1a('any string'));     // 'fnv1a:xxxxxxxx'
```

`CanonicalCbor.encode` produces a stable `Uint8Array` for any JSON-shaped value; `decode` is its strict inverse, accepting only the canonical subset the encoder emits. `AddressedDigest.of` pairs a sync FNV-1a `display_id` with a cryptographic `integrity_digest` over the very same bytes, so identity and integrity can never disagree.

## Where it sits

This package is a standalone leaf — it carries no `@czap/core`, no Effect, and no spine imports, which is exactly why upstream and WASM-side code can address content without dragging in the full graph. `@czap/core` re-anchors `ContentAddress` / `IntegrityDigest` to spine brands at its own boundary (ADR-0012); here they are kept local. See the [package surfaces map](https://github.com/heyoub/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If encoding throws

Only the JSON-shaped value subset encodes: numbers, strings, booleans, `null`, `Uint8Array`, arrays, and plain objects. Functions, symbols, `bigint`, `Map`, `Set`, and `Date` raise an `UnsupportedError` rather than emit ambiguous bytes — determinism is the whole point. Plain-object properties whose value is `undefined` are skipped, matching JSON semantics.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/GETTING-STARTED.md)
- [ADR-0013 — the canonical package](https://github.com/heyoub/LiteShip/blob/main/docs/adr/0013-canonical-package.md) — why the bytes kernel is a standalone leaf
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/canonical/src/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
