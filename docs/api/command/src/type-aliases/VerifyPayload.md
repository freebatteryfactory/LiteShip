[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / VerifyPayload

# Type Alias: VerifyPayload

> **VerifyPayload** = `object`

Defined in: [command/src/commands/verify.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L49)

Structured payload returned alongside a verdict.

## Properties

### capsule\_id

> `readonly` **capsule\_id**: [`ContentAddress`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/ContentAddress.md) \| `null`

Defined in: [command/src/commands/verify.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L51)

***

### checks

> `readonly` **checks**: `object`

Defined in: [command/src/commands/verify.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L52)

#### chain\_link

> `readonly` **chain\_link**: `"skipped"`

#### lockfile

> `readonly` **lockfile**: `"skipped"`

#### tarball\_manifest

> `readonly` **tarball\_manifest**: `"match"` \| `"mismatch"` \| `"skipped"`

#### workspace\_manifest

> `readonly` **workspace\_manifest**: `"skipped"`

***

### mismatches

> `readonly` **mismatches**: readonly `string`[]

Defined in: [command/src/commands/verify.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L58)

***

### tarball

> `readonly` **tarball**: `string`

Defined in: [command/src/commands/verify.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L50)
