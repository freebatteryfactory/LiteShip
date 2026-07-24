[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlumbGateSummary

# Interface: PlumbGateSummary

Defined in: [command/src/registry.ts:417](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L417)

Structured verdict returned by the injected [CommandContext.runPlumb](CommandContext.md#runplumb)
capability. `ok` ⟺ generated corpus present AND no skips AND no unclassified
packages. `generatedPresent` is false when `tests/generated/` had no corpus
to scan (⇒ run capsule:compile).

## Properties

### generatedCorpusMessage

> `readonly` **generatedCorpusMessage**: `string` \| `null`

Defined in: [command/src/registry.ts:426](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L426)

Human-readable reason when the generated test corpus is missing or empty.

***

### generatedPresent

> `readonly` **generatedPresent**: `boolean`

Defined in: [command/src/registry.ts:424](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L424)

Whether the generated test corpus was present to scan.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:418](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L418)

***

### skips

> `readonly` **skips**: readonly [`PlumbSkip`](PlumbSkip.md)[]

Defined in: [command/src/registry.ts:420](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L420)

Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking.

***

### unclassified

> `readonly` **unclassified**: readonly `string`[]

Defined in: [command/src/registry.ts:422](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L422)

Published packages with no PACKAGE_PLUMB classification.
