[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / ParseError

# Interface: ParseError

Defined in: [error/src/variants.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L51)

Decoding external bytes or text into a typed shape failed. The input came
from outside the program (a file, a wire payload, a config), and it did not
conform.

Migration target for: `CborDecodeError` (`code` = the reason discriminant,
`offset` = the byte position), JSON/manifest/profile parse throws across
`cli`, `edge`, `audit`, `command`.

## Extends

- [`TaggedError`](TaggedError.md)\<`"ParseError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"ParseError"`

Defined in: [error/src/contract.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L33)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### code?

> `readonly` `optional` **code?**: `string`

Defined in: [error/src/variants.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L57)

Optional machine-readable reason, for callers that branch on it.

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L55)

Why it failed, in human terms.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L35)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)

***

### offset?

> `readonly` `optional` **offset?**: `number`

Defined in: [error/src/variants.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L59)

Optional byte/char offset where parsing failed.

***

### source

> `readonly` **source**: `string`

Defined in: [error/src/variants.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L53)

What was being parsed, e.g. `'cbor'`, `'profile.json'`.
