[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CapsuleCommandResult

# Interface: CapsuleCommandResult\<P\>

Defined in: [\_spine/command.d.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L132)

The structured outcome of a command. The CLI adapter serializes `payload` to a
stdout JSON line; the MCP adapter returns the same `payload` as structuredContent.
No stdout capture, no flattening.

## Type Parameters

### P

`P` = `unknown`

## Properties

### command

> `readonly` **command**: `string`

Defined in: [\_spine/command.d.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L134)

***

### exitCode?

> `readonly` `optional` **exitCode?**: `number`

Defined in: [\_spine/command.d.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L141)

Process exit code the CLI adapter maps from the result (0 = ok).

***

### payload?

> `readonly` `optional` **payload?**: `P`

Defined in: [\_spine/command.d.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L139)

***

### status

> `readonly` **status**: `"ok"` \| `"failed"`

Defined in: [\_spine/command.d.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L133)

***

### timestamp

> `readonly` **timestamp**: `string`

Defined in: [\_spine/command.d.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L136)

Volatile wall-clock stamp — see [WallClockTimestamp](../type-aliases/WallClockTimestamp.md). Not causal, not in `resultId`.

***

### verdict?

> `readonly` `optional` **verdict?**: `"Verified"` \| `"Mismatch"` \| `"Incomplete"` \| `"Unknown"`

Defined in: [\_spine/command.d.ts:138](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L138)

Only verdict-bearing commands (ship verify) set this.
