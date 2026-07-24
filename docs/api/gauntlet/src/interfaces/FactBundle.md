[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FactBundle

# Interface: FactBundle

Defined in: [gauntlet/src/gate.ts:515](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L515)

The bundle a [FactGate](FactGate.md)'s [FactGate.decide](FactGate.md#decide) receives — ONLY the declared
FactPacks, picked off the context by the engine ([pickFacts](../functions/pickFacts.md)). It carries no
`readFile`, no `allFiles`, no undeclared channel: the decision is data-in, findings-out.

## Properties

### activeSurfaceFacts?

> `readonly` `optional` **activeSurfaceFacts?**: [`ActiveSurfaceFacts`](ActiveSurfaceFacts.md)

Defined in: [gauntlet/src/gate.ts:517](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L517)

***

### checkGovernance?

> `readonly` `optional` **checkGovernance?**: [`CheckGovernanceFacts`](CheckGovernanceFacts.md)

Defined in: [gauntlet/src/gate.ts:518](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L518)

***

### skipSites?

> `readonly` `optional` **skipSites?**: [`SkipSiteFacts`](SkipSiteFacts.md)

Defined in: [gauntlet/src/gate.ts:516](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L516)
