[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / NotFoundError

# Interface: NotFoundError

Defined in: [error/src/variants.ts:161](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L161)

A referenced resource or identifier was not found.

Migration target for: `ResourceNotFoundError`, `--profile path not found`,
`tarball has no package/package.json entry`, and the lookup-miss throws
across `cli`, `mcp-server`, `edge`.

## Extends

- [`TaggedError`](TaggedError.md)\<`"NotFoundError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"NotFoundError"`

Defined in: [error/src/contract.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L29)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### detail?

> `readonly` `optional` **detail?**: `string`

Defined in: [error/src/variants.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L167)

Optional extra context.

***

### id

> `readonly` **id**: `string`

Defined in: [error/src/variants.ts:165](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L165)

The identifier that missed, e.g. a path or URI.

***

### kind

> `readonly` **kind**: `string`

Defined in: [error/src/variants.ts:163](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L163)

The kind of thing sought, e.g. `'profile'`, `'resource'`.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L31)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)
