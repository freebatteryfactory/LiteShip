[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / CommandAnnotations

# Interface: CommandAnnotations

Defined in: [\_spine/command.d.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L31)

Surface hints for a command, expressed as DATA rather than two hand-edited
arrays (the CLI/MCP subset divergence becomes a field, not a maintenance gap).

## Properties

### cliOnly?

> `readonly` `optional` **cliOnly?**: `boolean`

Defined in: [\_spine/command.d.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L39)

Emits raw text (help/completion), not a JSON receipt.

***

### destructive?

> `readonly` `optional` **destructive?**: `boolean`

Defined in: [\_spine/command.d.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L37)

Destructive / side-effectful (e.g. publish).

***

### group?

> `readonly` `optional` **group?**: `string`

Defined in: [\_spine/command.d.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L52)

Presentation phase used to group the command in the CLI help list
("the command list grouped by phase"). Identity, not presentation: the
adapter maps a group key to a human label + order. Surfaces that don't group
(MCP, describe) ignore it.

***

### longRunning?

> `readonly` `optional` **longRunning?**: `boolean`

Defined in: [\_spine/command.d.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L33)

Long-running (e.g. dev server, the mcp server itself) — excluded from MCP tools by default.

***

### mcpExposed?

> `readonly` `optional` **mcpExposed?**: `boolean`

Defined in: [\_spine/command.d.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L45)

Explicit opt-in: the command is exposed as an MCP tool. Absent / false means
not exposed. (The exposed set is a deliberate curation, not derivable from
longRunning/cliOnly — e.g. glossary is read-only but intentionally CLI-only.)

***

### readOnly?

> `readonly` `optional` **readOnly?**: `boolean`

Defined in: [\_spine/command.d.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L35)

Read-only command (no mutation, safe to auto-run).
