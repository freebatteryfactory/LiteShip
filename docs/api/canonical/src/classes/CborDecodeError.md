[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / CborDecodeError

# Class: CborDecodeError

Defined in: [canonical/src/cbor-decode.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/canonical/src/cbor-decode.ts#L36)

Typed error for any input outside the canonical subset.

## Extends

- `Error`

## Constructors

### Constructor

> **new CborDecodeError**(`reason`, `message`, `offset`): `CborDecodeError`

Defined in: [canonical/src/cbor-decode.ts:40](https://github.com/heyoub/LiteShip/blob/main/packages/canonical/src/cbor-decode.ts#L40)

#### Parameters

##### reason

[`CborDecodeErrorReason`](../type-aliases/CborDecodeErrorReason.md)

##### message

`string`

##### offset

`number`

#### Returns

`CborDecodeError`

#### Overrides

`Error.constructor`

## Properties

### offset

> `readonly` **offset**: `number`

Defined in: [canonical/src/cbor-decode.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/canonical/src/cbor-decode.ts#L39)

Byte offset where decoding failed (best effort).

***

### reason

> `readonly` **reason**: [`CborDecodeErrorReason`](../type-aliases/CborDecodeErrorReason.md)

Defined in: [canonical/src/cbor-decode.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/canonical/src/cbor-decode.ts#L37)
