[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / decode

# Function: decode()

> **decode**(`bytes`): `unknown`

Defined in: [canonical/src/cbor-decode.ts:270](https://github.com/heyoub/LiteShip/blob/main/packages/canonical/src/cbor-decode.ts#L270)

Decode a canonical CBOR byte sequence produced by [CanonicalCbor.encode](../variables/CanonicalCbor.md#encode).

Strict: any deviation from the RFC 8949 §4.2.1 deterministic subset the
encoder emits (non-shortest forms, float16/32, indefinite lengths,
out-of-order map keys, trailing bytes) raises a typed [CborDecodeError](../classes/CborDecodeError.md).

## Parameters

### bytes

`Uint8Array`

## Returns

`unknown`

## Throws
