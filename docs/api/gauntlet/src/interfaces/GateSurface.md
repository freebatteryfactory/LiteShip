[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateSurface

# Interface: GateSurface

Defined in: [gauntlet/src/standards-facts.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L70)

One GATE in a standards set: its ruleId, the assurance level it operates at, the
set it belongs to, and the PRESENCE of each self-proving fixture (the authority
ratchet's evidence). A REMOVED gate (gone from the set), a gate dropped from a
set, a LOWERED level, or a REDUCED fixture count (a gate that no longer
self-proves loses its teeth) is a WEAKEN.

## Properties

### \_tag

> `readonly` **\_tag**: `"gate"`

Defined in: [gauntlet/src/standards-facts.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L71)

***

### greenFixtureCount

> `readonly` **greenFixtureCount**: `number`

Defined in: [gauntlet/src/standards-facts.ts:81](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L81)

1 iff the gate ships a `green` fixture (the known-good world it MUST pass), else 0.

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/standards-facts.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L77)

The assurance level the gate operates at — LOWERING it is a WEAKEN.

***

### mutationFixtureCount

> `readonly` **mutationFixtureCount**: `number`

Defined in: [gauntlet/src/standards-facts.ts:83](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L83)

1 iff the gate ships a `mutation` fixture (the operator its fixtures must kill), else 0.

***

### redFixtureCount

> `readonly` **redFixtureCount**: `number`

Defined in: [gauntlet/src/standards-facts.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L79)

1 iff the gate ships a `red` fixture (the known-bad world it MUST flag), else 0.

***

### ruleId

> `readonly` **ruleId**: `string`

Defined in: [gauntlet/src/standards-facts.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L73)

The gate's stable ruleId (the [Finding](Finding.md) namespace).

***

### set

> `readonly` **set**: `string`

Defined in: [gauntlet/src/standards-facts.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L75)

Which standards set this gate belongs to (`LITESHIP_GATES` / `LITESHIP_IR_GATES` / an opt-in set).
