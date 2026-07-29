[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / PublicSymbolContextSchema

# Variable: PublicSymbolContextSchema

> `const` **PublicSymbolContextSchema**: `object`

Defined in: [command/src/commands/public-surface-context.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/public-surface-context.ts#L66)

Structural schema reused by `explain` and `context`.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.allocation

> `readonly` **allocation**: `object`

#### properties.allocation.properties

> `readonly` **properties**: `object`

#### properties.allocation.properties.classification

> `readonly` **classification**: `object`

#### properties.allocation.properties.classification.enum

> `readonly` **enum**: readonly \[`"active-owned"`, `"gc-owned-mutable"`, `"pure-allocation"`\]

#### properties.allocation.properties.disposal

> `readonly` **disposal**: `object`

#### properties.allocation.properties.disposal.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.allocation.properties.operation

> `readonly` **operation**: `object`

#### properties.allocation.properties.operation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.allocation.properties.owner

> `readonly` **owner**: `object`

#### properties.allocation.properties.owner.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.allocation.properties.postDispose

> `readonly` **postDispose**: `object`

#### properties.allocation.properties.postDispose.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.allocation.properties.proof

> `readonly` **proof**: `object`

#### properties.allocation.properties.proof.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.allocation.properties.rationale

> `readonly` **rationale**: `object`

#### properties.allocation.properties.rationale.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.allocation.properties.siblingCleanup

> `readonly` **siblingCleanup**: `object`

#### properties.allocation.properties.siblingCleanup.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.allocation.properties.specifier

> `readonly` **specifier**: `object`

#### properties.allocation.properties.specifier.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.allocation.required

> `readonly` **required**: readonly \[`"operation"`, `"specifier"`, `"owner"`, `"classification"`, `"disposal"`, `"postDispose"`, `"siblingCleanup"`, `"proof"`, `"rationale"`\]

#### properties.allocation.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

#### properties.audience

> `readonly` **audience**: `object`

#### properties.audience.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.category

> `readonly` **category**: `object`

#### properties.category.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.checkIds

> `readonly` **checkIds**: `object`

#### properties.checkIds.items

> `readonly` **items**: `object`

#### properties.checkIds.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.checkIds.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.example

> `readonly` **example**: `object`

#### properties.example.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.expertRoutes

> `readonly` **expertRoutes**: `object`

#### properties.expertRoutes.items

> `readonly` **items**: `object`

#### properties.expertRoutes.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.expertRoutes.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.failureContract

> `readonly` **failureContract**: `object`

#### properties.failureContract.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.failureProof

> `readonly` **failureProof**: `object`

#### properties.failureProof.properties

> `readonly` **properties**: `object`

#### properties.failureProof.properties.importSource

> `readonly` **importSource**: `object`

#### properties.failureProof.properties.importSource.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.failureProof.properties.observation

> `readonly` **observation**: `object`

#### properties.failureProof.properties.observation.properties

> `readonly` **properties**: `object`

#### properties.failureProof.properties.observation.properties.code

> `readonly` **code**: `object`

#### properties.failureProof.properties.observation.properties.code.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.failureProof.properties.observation.properties.kind

> `readonly` **kind**: `object`

#### properties.failureProof.properties.observation.properties.kind.const

> `readonly` **const**: `"diagnostic-and-output-omission"` = `'diagnostic-and-output-omission'`

#### properties.failureProof.properties.observation.properties.outputField

> `readonly` **outputField**: `object`

#### properties.failureProof.properties.observation.properties.outputField.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.failureProof.properties.observation.required

> `readonly` **required**: readonly \[`"kind"`, `"code"`, `"outputField"`\]

#### properties.failureProof.properties.observation.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.failureProof.properties.operation

> `readonly` **operation**: `object`

#### properties.failureProof.properties.operation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.failureProof.properties.test

> `readonly` **test**: `object`

#### properties.failureProof.properties.test.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.failureProof.required

> `readonly` **required**: readonly \[`"test"`, `"importSource"`, `"operation"`, `"observation"`\]

#### properties.failureProof.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

#### properties.lifecycle

> `readonly` **lifecycle**: `object`

#### properties.lifecycle.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.owner

> `readonly` **owner**: `object`

#### properties.owner.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.producer

> `readonly` **producer**: `object`

#### properties.producer.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.proofRefs

> `readonly` **proofRefs**: `object`

#### properties.proofRefs.items

> `readonly` **items**: `object`

#### properties.proofRefs.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.proofRefs.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.relatedInvariant

> `readonly` **relatedInvariant**: `object`

#### properties.relatedInvariant.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.remediation

> `readonly` **remediation**: `object`

#### properties.remediation.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.replacement

> `readonly` **replacement**: `object`

#### properties.replacement.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.specifier

> `readonly` **specifier**: `object`

#### properties.specifier.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.stability

> `readonly` **stability**: `object`

#### properties.stability.enum

> `readonly` **enum**: readonly \[`"stable"`, `"experimental"`\]

#### properties.surfaceClass

> `readonly` **surfaceClass**: `object`

#### properties.surfaceClass.enum

> `readonly` **enum**: readonly \[`"paved-road"`, `"advanced-module"`\]

#### properties.symbol

> `readonly` **symbol**: `object`

#### properties.symbol.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.userStory

> `readonly` **userStory**: `object`

#### properties.userStory.type

> `readonly` **type**: `"string"` = `'string'`

### required

> `readonly` **required**: readonly \[`"symbol"`, `"specifier"`, `"owner"`, `"audience"`, `"category"`, `"surfaceClass"`, `"producer"`, `"relatedInvariant"`, `"replacement"`, `"userStory"`, `"lifecycle"`, `"failureContract"`, `"failureProof"`, `"example"`, `"stability"`, `"expertRoutes"`, `"checkIds"`, `"proofRefs"`, `"remediation"`, `"allocation"`\]

### type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]
