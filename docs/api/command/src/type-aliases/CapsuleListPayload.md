[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleListPayload

# Type Alias: CapsuleListPayload

> **CapsuleListPayload** = `object`

Defined in: [command/src/commands/capsule.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule.ts#L65)

Structured payload returned by `capsule.list` — the (optionally filtered) entries + the nullable `kind` echo.

## Properties

### capsules

> `readonly` **capsules**: readonly [`CapsuleManifestEntry`](../interfaces/CapsuleManifestEntry.md)[]

Defined in: [command/src/commands/capsule.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule.ts#L66)

***

### kind

> `readonly` **kind**: `string` \| `null`

Defined in: [command/src/commands/capsule.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule.ts#L67)
