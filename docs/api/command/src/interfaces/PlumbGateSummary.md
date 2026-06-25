[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlumbGateSummary

# Interface: PlumbGateSummary

Defined in: [command/src/registry.ts:379](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L379)

Structured verdict returned by the injected [CommandContext.runPlumb](CommandContext.md#runplumb)
capability. `ok` ⟺ no skips AND no unclassified packages. `generatedPresent`
is false when `tests/generated/` had no corpus to scan (⇒ run capsule:compile).

## Properties

### generatedPresent

> `readonly` **generatedPresent**: `boolean`

Defined in: [command/src/registry.ts:386](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L386)

Whether the generated test corpus was present to scan.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:380](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L380)

***

### skips

> `readonly` **skips**: readonly [`PlumbSkip`](PlumbSkip.md)[]

Defined in: [command/src/registry.ts:382](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L382)

Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking.

***

### unclassified

> `readonly` **unclassified**: readonly `string`[]

Defined in: [command/src/registry.ts:384](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L384)

Published packages with no PACKAGE_PLUMB classification.
