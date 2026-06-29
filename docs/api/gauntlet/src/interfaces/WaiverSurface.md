[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / WaiverSurface

# Interface: WaiverSurface

Defined in: [gauntlet/src/standards-facts.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L91)

One WAIVER in `LITESHIP_WAIVERS`: the rule it suppresses + its expiry. A NEW
waiver (more is waived), or a waiver whose expiry is EXTENDED (the debt deferred
longer), is a WEAKEN.

## Properties

### \_tag

> `readonly` **\_tag**: `"waiver"`

Defined in: [gauntlet/src/standards-facts.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L92)

***

### expiry

> `readonly` **expiry**: `string`

Defined in: [gauntlet/src/standards-facts.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L98)

The waiver's expiry (ISO `yyyy-mm-dd`). A LATER expiry is a WEAKEN.

***

### key

> `readonly` **key**: `string`

Defined in: [gauntlet/src/standards-facts.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L94)

A stable, content-derived key (ruleId + optional file/line) identifying this waiver.

***

### ruleId

> `readonly` **ruleId**: `string`

Defined in: [gauntlet/src/standards-facts.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L96)

The rule whose finding this waiver suppresses.
