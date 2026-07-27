[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / HostCapabilityError

# Interface: HostCapabilityError

Defined in: [error/src/variants.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L124)

A required runtime capability is absent in the current environment — the
code is correct but the host cannot run it (no WebCodecs, no OffscreenCanvas,
no attached canvas yet).

Migration target for: the host-capability/precondition throws across `web`,
`worker`, `edge`.

## Extends

- [`TaggedError`](TaggedError.md)\<`"HostCapabilityError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"HostCapabilityError"`

Defined in: [error/src/contract.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L33)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### capability

> `readonly` **capability**: `string`

Defined in: [error/src/variants.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L126)

The missing capability, e.g. `'WebCodecs.VideoEncoder'`.

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L128)

Context + remediation, in human terms.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L35)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)
