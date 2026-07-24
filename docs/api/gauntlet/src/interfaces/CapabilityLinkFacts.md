[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CapabilityLinkFacts

# Interface: CapabilityLinkFacts

Defined in: [gauntlet/src/facts/capability-link-facts.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L36)

The flat facts the `capabilityGateLinkGate` folds — one result per sanctioned skip site.

## Properties

### \_tag

> `readonly` **\_tag**: `"capability-link-facts"`

Defined in: [gauntlet/src/facts/capability-link-facts.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L37)

***

### definedCapabilities

> `readonly` **definedCapabilities**: readonly `string`[]

Defined in: [gauntlet/src/facts/capability-link-facts.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L39)

The canonical capability ids the symbol table defines (export-name-derived) — for self-description.

***

### results

> `readonly` **results**: readonly [`CapabilityLinkResult`](CapabilityLinkResult.md)[]

Defined in: [gauntlet/src/facts/capability-link-facts.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L41)

Per sanctioned-skip link results.
