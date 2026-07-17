[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleVerifyPayload

# Type Alias: CapsuleVerifyPayload

> **CapsuleVerifyPayload** = `object`

Defined in: [command/src/commands/capsule-verify.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L61)

Structured payload returned by `capsule-verify`.

## Properties

### benches

> `readonly` **benches**: `object`

Defined in: [command/src/commands/capsule-verify.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L65)

#### placeholder

> `readonly` **placeholder**: readonly `string`[]

#### real

> `readonly` **real**: `number`

#### total

> `readonly` **total**: `number`

***

### capsuleCount

> `readonly` **capsuleCount**: `number`

Defined in: [command/src/commands/capsule-verify.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L64)

***

### errors

> `readonly` **errors**: readonly `string`[]

Defined in: [command/src/commands/capsule-verify.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L63)

***

### status

> `readonly` **status**: `"ok"` \| `"stale"` \| `"failed"`

Defined in: [command/src/commands/capsule-verify.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L62)
