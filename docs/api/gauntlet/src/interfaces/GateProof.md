[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateProof

# Interface: GateProof

Defined in: [gauntlet/src/authority.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L30)

The evidence a gate produced by running against its own fixtures.

## Properties

### gateId

> `readonly` **gateId**: `string`

Defined in: [gauntlet/src/authority.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L31)

***

### greenClean

> `readonly` **greenClean**: `boolean`

Defined in: [gauntlet/src/authority.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L35)

Did the green (known-good) fixture produce 0 findings?

***

### mutationKilled

> `readonly` **mutationKilled**: `boolean`

Defined in: [gauntlet/src/authority.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L37)

Did mutating the gate's logic make its fixtures fail (mutation killed)?

***

### redCaught

> `readonly` **redCaught**: `boolean`

Defined in: [gauntlet/src/authority.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L33)

Did the red (known-bad) fixture produce ≥1 finding?

***

### selfProven

> `readonly` **selfProven**: `boolean`

Defined in: [gauntlet/src/authority.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L45)

Fully self-proven iff the three fixture axes hold and subject coverage is not opaque.

***

### subjectCoverage

> `readonly` **subjectCoverage**: [`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md) \| \{ `status`: `"not-applicable"`; \}

Defined in: [gauntlet/src/authority.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L43)

Did the gate enumerate the complete current-head population behind a
discrete-subject claim? `not-applicable` is engine-derived only when the
gate declares no separate subject census.
