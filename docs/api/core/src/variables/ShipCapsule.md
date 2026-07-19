[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ShipCapsule

# Variable: ShipCapsule

> `const` **ShipCapsule**: `object`

Defined in: [core/src/ship-capsule.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ship-capsule.ts#L216)

Public namespace for ShipCapsule (ADR-0011). `make` builds a capsule from
input (sync), `canonicalize` encodes it as canonical CBOR for transport /
hashing, `decode` round-trips canonical bytes and returns a `Result`
(`@liteship/error`) that rejects non-canonical encodings AND unknown
`schema_version`s (`unsupported_version`, fail-closed), `computeId` mints the
fnv1a label over the canonicalized payload (sync).

## Type Declaration

### canonicalize

> **canonicalize**: (`capsule`) => `Uint8Array`

#### Parameters

##### capsule

`ShipCapsuleShape`

#### Returns

`Uint8Array`

### computeId

> **computeId**: (`capsuleWithoutIdentity`) => `AddressedDigest`

#### Parameters

##### capsuleWithoutIdentity

`ShipCapsuleInput`

#### Returns

`AddressedDigest`

### decode

> **decode**: (`bytes`) => `Result`\<`ShipCapsuleShape`, `ShipCapsuleDecodeError`\>

#### Parameters

##### bytes

`Uint8Array`

#### Returns

`Result`\<`ShipCapsuleShape`, `ShipCapsuleDecodeError`\>

### make

> **make**: (`input`) => `ShipCapsuleShape`

#### Parameters

##### input

`ShipCapsuleInput`

#### Returns

`ShipCapsuleShape`
