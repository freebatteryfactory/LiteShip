[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / FactBundle

# Interface: FactBundle

Defined in: [gauntlet/src/gate.ts:688](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L688)

The bundle a [FactGate](FactGate.md)'s [FactGate.decide](FactGate.md#decide) receives — ONLY the declared
FactPacks, picked off the context by the engine ([pickFacts](../functions/pickFacts.md)). It carries no
`readFile`, no `allFiles`, no undeclared channel: the decision is data-in, findings-out.

## Properties

### activeSurfaceFacts?

> `readonly` `optional` **activeSurfaceFacts?**: [`ActiveSurfaceFacts`](ActiveSurfaceFacts.md)

Defined in: [gauntlet/src/gate.ts:690](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L690)

***

### checkGovernance?

> `readonly` `optional` **checkGovernance?**: [`CheckGovernanceFacts`](CheckGovernanceFacts.md)

Defined in: [gauntlet/src/gate.ts:692](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L692)

***

### featureEdges?

> `readonly` `optional` **featureEdges?**: [`FeatureEdgeFacts`](FeatureEdgeFacts.md)

Defined in: [gauntlet/src/gate.ts:691](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L691)

***

### skipSites?

> `readonly` `optional` **skipSites?**: [`SkipSiteFacts`](SkipSiteFacts.md)

Defined in: [gauntlet/src/gate.ts:689](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L689)
