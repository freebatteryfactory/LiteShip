[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / APPLY\_PATCH\_COMMAND

# Variable: APPLY\_PATCH\_COMMAND

> `const` **APPLY\_PATCH\_COMMAND**: `"czap.gauntlet.applyPatch"`

Defined in: [mcp-server/src/lsp/types.ts:199](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L199)

The client command id a `patch` workspace-edit and an `instruction` step-list
carry, so an editor extension knows which czap action it is applying. Stable
(pinned by a test) so a downstream client can register handlers against it.
