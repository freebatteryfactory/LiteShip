[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlumbGateSummary

# Interface: PlumbGateSummary

Defined in: [command/src/registry.ts:423](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L423)

Structured verdict returned by the injected [CommandContext.runPlumb](CommandContext.md#runplumb)
capability. `ok` ⟺ generated corpus present AND no skips AND no unclassified
packages. `generatedPresent` is false when `tests/generated/` had no corpus
to scan (⇒ run capsule:compile).

## Properties

### generatedCorpusMessage

> `readonly` **generatedCorpusMessage**: `string` \| `null`

Defined in: [command/src/registry.ts:432](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L432)

Human-readable reason when the generated test corpus is missing or empty.

***

### generatedPresent

> `readonly` **generatedPresent**: `boolean`

Defined in: [command/src/registry.ts:430](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L430)

Whether the generated test corpus was present to scan.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:424](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L424)

***

### skips

> `readonly` **skips**: readonly [`PlumbSkip`](PlumbSkip.md)[]

Defined in: [command/src/registry.ts:426](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L426)

Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking.

***

### unclassified

> `readonly` **unclassified**: readonly `string`[]

Defined in: [command/src/registry.ts:428](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L428)

Published packages with no PACKAGE_PLUMB classification.
