[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / StandardsSurface

# Interface: StandardsSurface

Defined in: [gauntlet/src/facts/standards-facts.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L214)

The full content-addressed STANDARDS SURFACE — a sorted, deterministic list of
elements + the address of the resolved surface (the drift keystone). The HOST
mints the address via the ONE `contentAddressOf` kernel; two extractions of the
same live config produce a byte-identical surface and the same address.

## Properties

### address

> `readonly` **address**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:220](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L220)

The content address (fnv1a over the canonical elements) — host-minted; drift detector.

***

### elements

> `readonly` **elements**: readonly [`StandardsElement`](../type-aliases/StandardsElement.md)[]

Defined in: [gauntlet/src/facts/standards-facts.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L218)

Every standards element, in canonical order (sorted by [surfaceElementKey](../functions/surfaceElementKey.md)).

***

### snapshotFormat

> `readonly` **snapshotFormat**: `1`

Defined in: [gauntlet/src/facts/standards-facts.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L216)

Snapshot format version — bumped if the element schema itself changes.
