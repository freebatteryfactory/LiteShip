[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / defineFactGate

# Function: defineFactGate()

> **defineFactGate**(`spec`): [`FactGate`](../interfaces/FactGate.md)

Defined in: [gauntlet/src/gate.ts:871](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L871)

Define a FACT GATE — the gate-as-data constructor. The author supplies a DECLARATION
([FactGateSpec.requires](../interfaces/FactGateSpec.md#requires)) and a context-free decision ([FactGateSpec.decide](../interfaces/FactGateSpec.md#decide));
this synthesizes the [Gate.run](../interfaces/Gate.md#run) (`decide(pickFacts(context, requires))`) and the
[Gate.evidenceDigest](../interfaces/Gate.md#evidencedigest) ([factBundleDigest](factBundleDigest.md)) the engine dispatches — so the
returned value is a structural [Gate](../interfaces/Gate.md) (it runs, caches, and self-proves through the
SAME engine path as every closure gate) whose decision physically cannot read undeclared
evidence. Validates eagerly, exactly like [defineGate](defineGate.md), plus a non-empty `requires`.

## Parameters

### spec

[`FactGateSpec`](../interfaces/FactGateSpec.md)

## Returns

[`FactGate`](../interfaces/FactGate.md)
