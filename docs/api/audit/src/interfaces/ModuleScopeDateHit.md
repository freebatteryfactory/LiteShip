[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ModuleScopeDateHit

# Interface: ModuleScopeDateHit

Defined in: [audit/src/workers-date-scan.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/workers-date-scan.ts#L46)

One module-load ambient-Date read, with its 1-based source position.

## Properties

### column

> `readonly` **column**: `number`

Defined in: [audit/src/workers-date-scan.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/workers-date-scan.ts#L50)

1-based column of the read.

***

### kind

> `readonly` **kind**: `"Date.now"` \| `"new Date"` \| `"Date"`

Defined in: [audit/src/workers-date-scan.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/workers-date-scan.ts#L52)

Which ambient-time API was read.

***

### line

> `readonly` **line**: `number`

Defined in: [audit/src/workers-date-scan.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/workers-date-scan.ts#L48)

1-based line of the read.

***

### text

> `readonly` **text**: `string`

Defined in: [audit/src/workers-date-scan.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/workers-date-scan.ts#L54)

A short display of the read (`Date.now()`).
