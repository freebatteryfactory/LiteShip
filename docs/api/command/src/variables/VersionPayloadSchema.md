[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / VersionPayloadSchema

# Variable: VersionPayloadSchema

> `const` **VersionPayloadSchema**: `object`

Defined in: [command/src/commands/version.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/version.ts#L18)

The descriptor `outputSchema` for the version command — hand-written
JSON-Schema, byte-parity-pinned against the parity fixture. [VersionPayload](../type-aliases/VersionPayload.md)
is the plain-TS mirror of this shape; the two are kept in step by the
output-schema-law payload-conformance test, not by a shared Effect Schema.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.liteship

> `readonly` **liteship**: `object`

#### properties.liteship.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.node

> `readonly` **node**: `object`

#### properties.node.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.pnpm

> `readonly` **pnpm**: `object`

#### properties.pnpm.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

### required

> `readonly` **required**: readonly \[`"liteship"`, `"node"`, `"pnpm"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
