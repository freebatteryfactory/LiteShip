[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / isFactGate

# Function: isFactGate()

> **isFactGate**(`gate`): `gate is FactGate`

Defined in: [gauntlet/src/gate.ts:828](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L828)

Narrow a [Gate](../interfaces/Gate.md) to the [FactGate](../interfaces/FactGate.md) variant — by UNFORGEABLE `FACT_GATES`
membership, NOT the public `form` string and NOT an on-object brand. A hand-built
`{ form: 'fact', run: ctx => readSecret(ctx) }` forgery (which `defineGate` rejects outright,
but a raw object could still claim), a symbol harvested off a real fact gate, or a
`{ ...factGate, run: smuggle }` spread are all NON-members: only the exact object
[defineFactGate](defineFactGate.md) minted is in the set. So a caller that trusts `isFactGate` to mean
"this gate's decision cannot read undeclared evidence" is not being lied to.

## Parameters

### gate

[`Gate`](../interfaces/Gate.md)

## Returns

`gate is FactGate`
