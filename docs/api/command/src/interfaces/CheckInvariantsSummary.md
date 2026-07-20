[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckInvariantsSummary

# Interface: CheckInvariantsSummary

Defined in: [command/src/registry.ts:452](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L452)

Structured verdict returned by the injected [CommandContext.runCheckInvariants](CommandContext.md#runcheckinvariants)
capability. `ok` ⟺ no banned-pattern violation in any rule AND no line-ending
policy violation. `groups` carries the per-rule violation lists; `lineEndings`
carries the `.gitattributes` eol offenders.

## Properties

### groups

> `readonly` **groups**: readonly [`InvariantViolationGroup`](InvariantViolationGroup.md)[]

Defined in: [command/src/registry.ts:455](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L455)

Banned-pattern violations, grouped by the rule that flagged them.

***

### lineEndings

> `readonly` **lineEndings**: readonly `string`[]

Defined in: [command/src/registry.ts:457](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L457)

Committed text files whose line endings violate the `.gitattributes` policy.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:453](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L453)
