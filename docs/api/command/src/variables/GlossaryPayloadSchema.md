[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / GlossaryPayloadSchema

# Variable: GlossaryPayloadSchema

> `const` **GlossaryPayloadSchema**: `object`

Defined in: [command/src/commands/glossary.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/glossary.ts#L24)

The descriptor `outputSchema` for the glossary command — hand-written
JSON-Schema, byte-parity-pinned against the parity fixture. [GlossaryPayload](../type-aliases/GlossaryPayload.md)
is its plain-TS mirror (the `entries` element mirrors [GlossaryEntry](../type-aliases/GlossaryEntry.md)).

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.entries

> `readonly` **entries**: `object`

#### properties.entries.items

> `readonly` **items**: `object`

#### properties.entries.items.properties

> `readonly` **properties**: `object`

#### properties.entries.items.properties.category

> `readonly` **category**: `object`

#### properties.entries.items.properties.category.enum

> `readonly` **enum**: readonly \[`"naming"`, `"primitive"`, `"translator-note"`\]

#### properties.entries.items.properties.definition

> `readonly` **definition**: `object`

#### properties.entries.items.properties.definition.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.entries.items.properties.seeAlso

> `readonly` **seeAlso**: `object`

#### properties.entries.items.properties.seeAlso.items

> `readonly` **items**: `object`

#### properties.entries.items.properties.seeAlso.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.entries.items.properties.seeAlso.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.entries.items.properties.term

> `readonly` **term**: `object`

#### properties.entries.items.properties.term.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.entries.items.required

> `readonly` **required**: readonly \[`"term"`, `"category"`, `"definition"`\]

#### properties.entries.items.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.entries.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.term

> `readonly` **term**: `object`

#### properties.term.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

### required

> `readonly` **required**: readonly \[`"term"`, `"entries"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
