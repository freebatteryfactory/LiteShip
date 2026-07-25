[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ContextPayloadSchema

# Variable: ContextPayloadSchema

> `const` **ContextPayloadSchema**: `object`

Defined in: [command/src/commands/context.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/context.ts#L31)

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

#### properties.publicSurface

> `readonly` **publicSurface**: `object` = `PublicSymbolContextSchema`

#### properties.publicSurface.properties

> `readonly` **properties**: `object`

#### properties.publicSurface.properties.allocation

> `readonly` **allocation**: `object`

#### properties.publicSurface.properties.allocation.properties

> `readonly` **properties**: `object`

#### properties.publicSurface.properties.allocation.properties.classification

> `readonly` **classification**: `object`

#### properties.publicSurface.properties.allocation.properties.classification.enum

> `readonly` **enum**: readonly \[`"active-owned"`, `"gc-owned-mutable"`, `"pure-allocation"`\]

#### properties.publicSurface.properties.allocation.properties.disposal

> `readonly` **disposal**: `object`

#### properties.publicSurface.properties.allocation.properties.disposal.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.allocation.properties.operation

> `readonly` **operation**: `object`

#### properties.publicSurface.properties.allocation.properties.operation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.allocation.properties.owner

> `readonly` **owner**: `object`

#### properties.publicSurface.properties.allocation.properties.owner.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.allocation.properties.postDispose

> `readonly` **postDispose**: `object`

#### properties.publicSurface.properties.allocation.properties.postDispose.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.allocation.properties.proof

> `readonly` **proof**: `object`

#### properties.publicSurface.properties.allocation.properties.proof.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.allocation.properties.rationale

> `readonly` **rationale**: `object`

#### properties.publicSurface.properties.allocation.properties.rationale.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.allocation.properties.siblingCleanup

> `readonly` **siblingCleanup**: `object`

#### properties.publicSurface.properties.allocation.properties.siblingCleanup.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.allocation.properties.specifier

> `readonly` **specifier**: `object`

#### properties.publicSurface.properties.allocation.properties.specifier.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.allocation.required

> `readonly` **required**: readonly \[`"operation"`, `"specifier"`, `"owner"`, `"classification"`, `"disposal"`, `"postDispose"`, `"siblingCleanup"`, `"proof"`, `"rationale"`\]

#### properties.publicSurface.properties.allocation.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

#### properties.publicSurface.properties.checkIds

> `readonly` **checkIds**: `object`

#### properties.publicSurface.properties.checkIds.items

> `readonly` **items**: `object`

#### properties.publicSurface.properties.checkIds.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.checkIds.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.publicSurface.properties.example

> `readonly` **example**: `object`

#### properties.publicSurface.properties.example.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.expertRoutes

> `readonly` **expertRoutes**: `object`

#### properties.publicSurface.properties.expertRoutes.items

> `readonly` **items**: `object`

#### properties.publicSurface.properties.expertRoutes.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.expertRoutes.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.publicSurface.properties.failureContract

> `readonly` **failureContract**: `object`

#### properties.publicSurface.properties.failureContract.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.lifecycle

> `readonly` **lifecycle**: `object`

#### properties.publicSurface.properties.lifecycle.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.owner

> `readonly` **owner**: `object`

#### properties.publicSurface.properties.owner.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.proofRefs

> `readonly` **proofRefs**: `object`

#### properties.publicSurface.properties.proofRefs.items

> `readonly` **items**: `object`

#### properties.publicSurface.properties.proofRefs.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.proofRefs.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.publicSurface.properties.remediation

> `readonly` **remediation**: `object`

#### properties.publicSurface.properties.remediation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.specifier

> `readonly` **specifier**: `object`

#### properties.publicSurface.properties.specifier.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.stability

> `readonly` **stability**: `object`

#### properties.publicSurface.properties.stability.enum

> `readonly` **enum**: readonly \[`"stable"`, `"experimental"`\]

#### properties.publicSurface.properties.symbol

> `readonly` **symbol**: `object`

#### properties.publicSurface.properties.symbol.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.properties.userStory

> `readonly` **userStory**: `object`

#### properties.publicSurface.properties.userStory.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.publicSurface.required

> `readonly` **required**: readonly \[`"symbol"`, `"specifier"`, `"owner"`, `"userStory"`, `"lifecycle"`, `"failureContract"`, `"example"`, `"stability"`, `"expertRoutes"`, `"checkIds"`, `"proofRefs"`, `"remediation"`, `"allocation"`\]

#### properties.publicSurface.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

#### properties.subject

> `readonly` **subject**: `object`

#### properties.subject.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.summary

> `readonly` **summary**: `object`

#### properties.summary.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.task

> `readonly` **task**: `object`

#### properties.task.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.title

> `readonly` **title**: `object`

#### properties.title.type

> `readonly` **type**: `"string"` = `'string'`

### required

> `readonly` **required**: readonly \[`"task"`, `"subject"`, `"title"`, `"summary"`, `"pointers"`, `"publicSurface"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
