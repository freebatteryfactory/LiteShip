[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / pickFacts

# Function: pickFacts()

> **pickFacts**(`context`, `requires`): [`FactBundle`](../interfaces/FactBundle.md)

Defined in: [gauntlet/src/gate.ts:599](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L599)

Pick EXACTLY the declared FactPacks off a context into a [FactBundle](../interfaces/FactBundle.md) — the engine
seam that hands a [FactGate](../interfaces/FactGate.md)'s [FactGate.decide](../interfaces/FactGate.md#decide) only what it declared. A
channel the host did not inject arrives as `undefined` (the decision folds it as "absent
→ nothing to judge"); an UNDECLARED channel is simply never read. This is the physical
boundary: `decide` sees this bundle, never the context.

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### requires

readonly `"skipSites"`[]

## Returns

[`FactBundle`](../interfaces/FactBundle.md)
