[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlumbGateSummary

# Interface: PlumbGateSummary

Defined in: [command/src/registry.ts:380](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L380)

Structured verdict returned by the injected [CommandContext.runPlumb](CommandContext.md#runplumb)
capability. `ok` ⟺ generated corpus present AND no skips AND no unclassified
packages. `generatedPresent` is false when `tests/generated/` had no corpus
to scan (⇒ run capsule:compile).

## Properties

### generatedCorpusMessage

> `readonly` **generatedCorpusMessage**: `string` \| `null`

Defined in: [command/src/registry.ts:389](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L389)

Human-readable reason when the generated test corpus is missing or empty.

***

### generatedPresent

> `readonly` **generatedPresent**: `boolean`

Defined in: [command/src/registry.ts:387](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L387)

Whether the generated test corpus was present to scan.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:381](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L381)

***

### skips

> `readonly` **skips**: readonly [`PlumbSkip`](PlumbSkip.md)[]

Defined in: [command/src/registry.ts:383](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L383)

Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking.

***

### unclassified

> `readonly` **unclassified**: readonly `string`[]

Defined in: [command/src/registry.ts:385](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L385)

Published packages with no PACKAGE_PLUMB classification.
