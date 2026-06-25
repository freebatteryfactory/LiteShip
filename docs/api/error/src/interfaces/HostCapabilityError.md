[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / HostCapabilityError

# Interface: HostCapabilityError

Defined in: [error/src/variants.ts:123](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts#L123)

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

Defined in: [error/src/contract.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L29)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### capability

> `readonly` **capability**: `string`

Defined in: [error/src/variants.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts#L125)

The missing capability, e.g. `'WebCodecs.VideoEncoder'`.

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:127](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts#L127)

Context + remediation, in human terms.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L31)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)
