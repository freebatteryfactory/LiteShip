[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / UnsupportedError

# Interface: UnsupportedError

Defined in: [error/src/variants.ts:189](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L189)

A value or case fell outside the supported set — a known-but-unhandled
platform, an AST node with no mapping, a reserved encoding.

Migration target for: `UnsupportedSchemaError`, `unsupported platform`, and
the "outside the modelled set" throws across `core` (`harness`), `command`.

## Extends

- [`TaggedError`](TaggedError.md)\<`"UnsupportedError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"UnsupportedError"`

Defined in: [error/src/contract.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L29)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L193)

The unsupported value + what IS supported, in human terms.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L31)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)

***

### subject

> `readonly` **subject**: `string`

Defined in: [error/src/variants.ts:191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L191)

What was unsupported, e.g. `'schema node'`, `'platform'`.
