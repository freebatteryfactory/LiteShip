[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ExplainPayloadSchema

# Variable: ExplainPayloadSchema

> `const` **ExplainPayloadSchema**: `object`

Defined in: [command/src/commands/explain.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L91)

The descriptor `outputSchema` for the explain command — hand-written JSON-Schema
in the structural subset (nullable objects via `type: ['object','null']`).
[ExplainPayload](../type-aliases/ExplainPayload.md) is its plain-TS mirror.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.diagnostic

> `readonly` **diagnostic**: `object`

#### properties.diagnostic.properties

> `readonly` **properties**: `object`

#### properties.diagnostic.properties.area

> `readonly` **area**: `object`

#### properties.diagnostic.properties.area.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.diagnostic.properties.code

> `readonly` **code**: `object`

#### properties.diagnostic.properties.code.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.diagnostic.properties.emitter

> `readonly` **emitter**: `object`

#### properties.diagnostic.properties.emitter.properties

> `readonly` **properties**: `object`

#### properties.diagnostic.properties.emitter.properties.authority

> `readonly` **authority**: `object`

#### properties.diagnostic.properties.emitter.properties.authority.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.diagnostic.properties.emitter.properties.command

> `readonly` **command**: `object`

#### properties.diagnostic.properties.emitter.properties.command.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.diagnostic.properties.emitter.properties.id

> `readonly` **id**: `object`

#### properties.diagnostic.properties.emitter.properties.id.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.diagnostic.properties.emitter.properties.kind

> `readonly` **kind**: `object`

#### properties.diagnostic.properties.emitter.properties.kind.enum

> `readonly` **enum**: readonly \[`"gate"`, `"check"`, `"domain"`\]

#### properties.diagnostic.properties.emitter.properties.negativeControl

> `readonly` **negativeControl**: `object`

#### properties.diagnostic.properties.emitter.properties.negativeControl.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.diagnostic.properties.emitter.properties.owner

> `readonly` **owner**: `object`

#### properties.diagnostic.properties.emitter.properties.owner.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.diagnostic.properties.emitter.properties.provenByCheck

> `readonly` **provenByCheck**: `object`

#### properties.diagnostic.properties.emitter.properties.provenByCheck.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.diagnostic.properties.emitter.required

> `readonly` **required**: readonly \[`"kind"`, `"id"`, `"negativeControl"`, `"provenByCheck"`, `"owner"`, `"command"`, `"authority"`\]

#### properties.diagnostic.properties.emitter.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.diagnostic.properties.explanation

> `readonly` **explanation**: `object`

#### properties.diagnostic.properties.explanation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.diagnostic.properties.remediation

> `readonly` **remediation**: `object`

#### properties.diagnostic.properties.remediation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.diagnostic.properties.title

> `readonly` **title**: `object`

#### properties.diagnostic.properties.title.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.diagnostic.required

> `readonly` **required**: readonly \[`"code"`, `"area"`, `"title"`, `"explanation"`, `"remediation"`, `"emitter"`\]

#### properties.diagnostic.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

#### properties.kind

> `readonly` **kind**: `object`

#### properties.kind.enum

> `readonly` **enum**: readonly \[`"diagnostic"`, `"symbol"`, `"unresolved"`\]

#### properties.query

> `readonly` **query**: `object`

#### properties.query.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol

> `readonly` **symbol**: `object`

#### properties.symbol.properties

> `readonly` **properties**: `object`

#### properties.symbol.properties.file

> `readonly` **file**: `object`

#### properties.symbol.properties.file.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.kind

> `readonly` **kind**: `object`

#### properties.symbol.properties.kind.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.package

> `readonly` **package**: `object`

#### properties.symbol.properties.package.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.packageDescription

> `readonly` **packageDescription**: `object`

#### properties.symbol.properties.packageDescription.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.subpath

> `readonly` **subpath**: `object`

#### properties.symbol.properties.subpath.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.summary

> `readonly` **summary**: `object`

#### properties.symbol.properties.summary.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface

> `readonly` **surface**: `object` = `PublicSymbolContextSchema`

#### properties.symbol.properties.surface.properties

> `readonly` **properties**: `object`

#### properties.symbol.properties.surface.properties.allocation

> `readonly` **allocation**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties

> `readonly` **properties**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.classification

> `readonly` **classification**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.classification.enum

> `readonly` **enum**: readonly \[`"active-owned"`, `"gc-owned-mutable"`, `"pure-allocation"`\]

#### properties.symbol.properties.surface.properties.allocation.properties.disposal

> `readonly` **disposal**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.disposal.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.allocation.properties.operation

> `readonly` **operation**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.operation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.allocation.properties.owner

> `readonly` **owner**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.owner.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.allocation.properties.postDispose

> `readonly` **postDispose**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.postDispose.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.allocation.properties.proof

> `readonly` **proof**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.proof.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.allocation.properties.rationale

> `readonly` **rationale**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.rationale.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.allocation.properties.siblingCleanup

> `readonly` **siblingCleanup**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.siblingCleanup.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.allocation.properties.specifier

> `readonly` **specifier**: `object`

#### properties.symbol.properties.surface.properties.allocation.properties.specifier.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.allocation.required

> `readonly` **required**: readonly \[`"operation"`, `"specifier"`, `"owner"`, `"classification"`, `"disposal"`, `"postDispose"`, `"siblingCleanup"`, `"proof"`, `"rationale"`\]

#### properties.symbol.properties.surface.properties.allocation.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

#### properties.symbol.properties.surface.properties.checkIds

> `readonly` **checkIds**: `object`

#### properties.symbol.properties.surface.properties.checkIds.items

> `readonly` **items**: `object`

#### properties.symbol.properties.surface.properties.checkIds.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.checkIds.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.symbol.properties.surface.properties.example

> `readonly` **example**: `object`

#### properties.symbol.properties.surface.properties.example.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.expertRoutes

> `readonly` **expertRoutes**: `object`

#### properties.symbol.properties.surface.properties.expertRoutes.items

> `readonly` **items**: `object`

#### properties.symbol.properties.surface.properties.expertRoutes.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.expertRoutes.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.symbol.properties.surface.properties.failureContract

> `readonly` **failureContract**: `object`

#### properties.symbol.properties.surface.properties.failureContract.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.lifecycle

> `readonly` **lifecycle**: `object`

#### properties.symbol.properties.surface.properties.lifecycle.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.owner

> `readonly` **owner**: `object`

#### properties.symbol.properties.surface.properties.owner.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.proofRefs

> `readonly` **proofRefs**: `object`

#### properties.symbol.properties.surface.properties.proofRefs.items

> `readonly` **items**: `object`

#### properties.symbol.properties.surface.properties.proofRefs.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.proofRefs.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.symbol.properties.surface.properties.remediation

> `readonly` **remediation**: `object`

#### properties.symbol.properties.surface.properties.remediation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.specifier

> `readonly` **specifier**: `object`

#### properties.symbol.properties.surface.properties.specifier.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.stability

> `readonly` **stability**: `object`

#### properties.symbol.properties.surface.properties.stability.enum

> `readonly` **enum**: readonly \[`"stable"`, `"experimental"`\]

#### properties.symbol.properties.surface.properties.symbol

> `readonly` **symbol**: `object`

#### properties.symbol.properties.surface.properties.symbol.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.properties.userStory

> `readonly` **userStory**: `object`

#### properties.symbol.properties.surface.properties.userStory.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.properties.surface.required

> `readonly` **required**: readonly \[`"symbol"`, `"specifier"`, `"owner"`, `"userStory"`, `"lifecycle"`, `"failureContract"`, `"example"`, `"stability"`, `"expertRoutes"`, `"checkIds"`, `"proofRefs"`, `"remediation"`, `"allocation"`\]

#### properties.symbol.properties.surface.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

#### properties.symbol.properties.symbol

> `readonly` **symbol**: `object`

#### properties.symbol.properties.symbol.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.required

> `readonly` **required**: readonly \[`"symbol"`, `"package"`, `"subpath"`, `"file"`, `"kind"`, `"summary"`, `"packageDescription"`, `"surface"`\]

#### properties.symbol.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

### required

> `readonly` **required**: readonly \[`"query"`, `"kind"`, `"diagnostic"`, `"symbol"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
