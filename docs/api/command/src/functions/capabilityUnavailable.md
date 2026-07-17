[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / capabilityUnavailable

# Function: capabilityUnavailable()

> **capabilityUnavailable**(`command`, `missing`): [`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)

Defined in: [command/src/registry.ts:475](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L475)

The ONE structured failure for a missing injected capability. The dispatcher
emits it for unmet descriptor `requires`; handlers reuse it for capabilities
they only need conditionally. Exit code 2 — the dominant convention among the
per-handler absence checks this replaces (capsule.verify / scene.verify /
asset.verify all used 2; scene.render's 5 and asset.analyze's 1 were outliers).

## Parameters

### command

`string`

### missing

readonly [`CommandCapability`](../type-aliases/CommandCapability.md)[]

## Returns

[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)
