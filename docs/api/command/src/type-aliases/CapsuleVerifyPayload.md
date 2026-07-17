[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleVerifyPayload

# Type Alias: CapsuleVerifyPayload

> **CapsuleVerifyPayload** = `object`

Defined in: [command/src/commands/capsule-verify.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L63)

Structured payload returned by `capsule-verify`.

## Properties

### benches

> `readonly` **benches**: `object`

Defined in: [command/src/commands/capsule-verify.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L67)

#### placeholder

> `readonly` **placeholder**: readonly `string`[]

#### real

> `readonly` **real**: `number`

#### total

> `readonly` **total**: `number`

***

### capsuleCount

> `readonly` **capsuleCount**: `number`

Defined in: [command/src/commands/capsule-verify.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L66)

***

### errors

> `readonly` **errors**: readonly `string`[]

Defined in: [command/src/commands/capsule-verify.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L65)

***

### status

> `readonly` **status**: `"ok"` \| `"stale"` \| `"failed"`

Defined in: [command/src/commands/capsule-verify.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L64)
