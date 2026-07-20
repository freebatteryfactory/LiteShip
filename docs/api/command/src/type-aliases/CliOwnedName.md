[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CliOwnedName

# Type Alias: CliOwnedName

> **CliOwnedName** = *typeof* [`CLI_OWNED_DESCRIPTORS`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts)\[`number`\]\[`"name"`\]

Defined in: [command/src/catalog.ts:227](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L227)

The closed union of CLI-owned command names, DERIVED from
[CLI\_OWNED\_DESCRIPTORS](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts) (`as const`). The CLI's dispatch keys its
`CLI_EXECUTORS` record by this type, so a CLI-owned command declared here
without an executor is a COMPILE error and a stray executor is dead-code
flagged — the projection cannot silently drift from the catalog.
