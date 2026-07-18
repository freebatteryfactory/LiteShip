[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / decode

# Function: decode()

> **decode**(`bytes`): `unknown`

Defined in: [canonical/src/cbor-decode.ts:263](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/cbor-decode.ts#L263)

Decode a canonical CBOR byte sequence produced by [CanonicalCbor.encode](../variables/CanonicalCbor.md#encode).

Strict: any deviation from the RFC 8949 §4.2.1 deterministic subset the
encoder emits (non-shortest forms, float16/32, indefinite lengths,
out-of-order map keys, trailing bytes) raises a typed `ParseError`
(source `'cbor'`, `code` = the reason discriminant).

## Parameters

### bytes

`Uint8Array`

## Returns

`unknown`

## Throws

A `@czap/error` `ParseError` (`source` `'cbor'`).
