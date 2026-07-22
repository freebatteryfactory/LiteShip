[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ExplainPayloadSchema

# Variable: ExplainPayloadSchema

> `const` **ExplainPayloadSchema**: `object`

Defined in: [command/src/commands/explain.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L84)

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

#### properties.symbol.properties.symbol

> `readonly` **symbol**: `object`

#### properties.symbol.properties.symbol.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.symbol.required

> `readonly` **required**: readonly \[`"symbol"`, `"package"`, `"subpath"`, `"file"`, `"kind"`, `"summary"`, `"packageDescription"`\]

#### properties.symbol.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

### required

> `readonly` **required**: readonly \[`"query"`, `"kind"`, `"diagnostic"`, `"symbol"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
