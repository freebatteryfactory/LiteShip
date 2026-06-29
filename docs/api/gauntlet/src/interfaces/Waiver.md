[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / Waiver

# Interface: Waiver

Defined in: [gauntlet/src/waiver.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L34)

A single waiver — owner-accountable, time-boxed suppression of one finding.

A waiver MATCHES a finding iff `ruleId` is equal AND (if [file](#file) is set)
the finding's file is equal AND (if [line](#line) is set) the finding's line is
equal. The narrower the waiver, the less it accidentally suppresses.

## Properties

### blastRadius

> `readonly` **blastRadius**: `string`

Defined in: [gauntlet/src/waiver.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L48)

What breaks if this debt is wrong — the honesty tax on a waiver.

***

### debtScore

> `readonly` **debtScore**: `number`

Defined in: [gauntlet/src/waiver.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L50)

A numeric cost for this debt — feeds debt rollups / ratchets.

***

### expires

> `readonly` **expires**: `string`

Defined in: [gauntlet/src/waiver.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L46)

When the waiver dies (ISO `yyyy-mm-dd`). Past `now` → an `error` finding.

***

### file?

> `readonly` `optional` **file?**: `string`

Defined in: [gauntlet/src/waiver.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L38)

Optional file scope — when set, only findings in this file match.

***

### line?

> `readonly` `optional` **line?**: `number`

Defined in: [gauntlet/src/waiver.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L40)

Optional line scope — when set, only findings on this line match.

***

### owner

> `readonly` **owner**: `string`

Defined in: [gauntlet/src/waiver.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L42)

Who owns this debt — accountability is mandatory, never anonymous.

***

### reason

> `readonly` **reason**: `string`

Defined in: [gauntlet/src/waiver.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L44)

Why the finding is being suppressed — the justification of record.

***

### ruleId

> `readonly` **ruleId**: `string`

Defined in: [gauntlet/src/waiver.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L36)

The rule whose finding this waiver suppresses (must equal the finding's `ruleId`).
