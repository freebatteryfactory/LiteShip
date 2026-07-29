[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / CapsuleResultReceipt

# Interface: CapsuleResultReceipt

Defined in: [\_spine/command.d.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L152)

LiteShip result identity carried in an MCP tool result's `_meta` under the
reverse-DNS key [CapsuleResultMetaKey](../type-aliases/CapsuleResultMetaKey.md) (CUT D1). Provenance, NOT the
semantic payload: `structuredContent` carries the payload (what an
`outputSchema` will describe in D2); this carries who produced it plus a
content-addressed identity. A cross-adapter pure type — the MCP skin
populates it now; the CLI may project the same identity later.

## Properties

### command

> `readonly` **command**: `string`

Defined in: [\_spine/command.d.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L154)

Canonical command id that produced the result.

***

### exitCode?

> `readonly` `optional` **exitCode?**: `number`

Defined in: [\_spine/command.d.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L164)

***

### resultId

> `readonly` **resultId**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/command.d.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L160)

Content address over the STABLE result (command + status + payload +
verdict? + exitCode?). Excludes the volatile `timestamp` so identical
outcomes share an id (idempotency). Advisory identity, not an integrity digest.

***

### timestamp

> `readonly` **timestamp**: `string`

Defined in: [\_spine/command.d.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L162)

Volatile wall-clock stamp ([WallClockTimestamp](../type-aliases/WallClockTimestamp.md)) — carried as-is, NOT part of `resultId`.

***

### verdict?

> `readonly` `optional` **verdict?**: `"Verified"` \| `"Mismatch"` \| `"Incomplete"` \| `"Unknown"`

Defined in: [\_spine/command.d.ts:163](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L163)
