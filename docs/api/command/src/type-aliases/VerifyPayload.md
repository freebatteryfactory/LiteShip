[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / VerifyPayload

# Type Alias: VerifyPayload

> **VerifyPayload** = `object`

Defined in: [command/src/commands/verify.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L56)

Structured payload returned alongside a verdict.

## Properties

### capsule\_id

> `readonly` **capsule\_id**: [`ContentAddress`](../../../liteship/src/schema/type-aliases/ContentAddress.md) \| `null`

Defined in: [command/src/commands/verify.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L58)

***

### checks

> `readonly` **checks**: `object`

Defined in: [command/src/commands/verify.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L59)

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

Defined in: [command/src/commands/verify.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L65)

***

### tarball

> `readonly` **tarball**: `string`

Defined in: [command/src/commands/verify.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L57)
