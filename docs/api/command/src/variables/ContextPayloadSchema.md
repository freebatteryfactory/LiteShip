[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ContextPayloadSchema

# Variable: ContextPayloadSchema

> `const` **ContextPayloadSchema**: `object`

Defined in: [command/src/commands/context.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/context.ts#L26)

The descriptor `outputSchema` for the context command — hand-written JSON-Schema.
[ContextPayload](../type-aliases/ContextPayload.md) is its plain-TS mirror; the `pointers` element mirrors
[ContextPointer](../interfaces/ContextPointer.md).

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.pointers

> `readonly` **pointers**: `object`

#### properties.pointers.items

> `readonly` **items**: `object`

#### properties.pointers.items.properties

> `readonly` **properties**: `object`

#### properties.pointers.items.properties.checkId

> `readonly` **checkId**: `object`

#### properties.pointers.items.properties.checkId.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.pointers.items.properties.kind

> `readonly` **kind**: `object`

#### properties.pointers.items.properties.kind.enum

> `readonly` **enum**: readonly \[`"owner-file"`, `"entrypoint"`, `"check"`, `"test"`, `"doc"`\]

#### properties.pointers.items.properties.note

> `readonly` **note**: `object`

#### properties.pointers.items.properties.note.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.pointers.items.properties.path

> `readonly` **path**: `object`

#### properties.pointers.items.properties.path.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.pointers.items.required

> `readonly` **required**: readonly \[`"kind"`, `"path"`, `"note"`, `"checkId"`\]

#### properties.pointers.items.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.pointers.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.summary

> `readonly` **summary**: `object`

#### properties.summary.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.task

> `readonly` **task**: `object`

#### properties.task.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.title

> `readonly` **title**: `object`

#### properties.title.type

> `readonly` **type**: `"string"` = `'string'`

### required

> `readonly` **required**: readonly \[`"task"`, `"title"`, `"summary"`, `"pointers"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
