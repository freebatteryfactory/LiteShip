[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckInvariantsPayloadSchema

# Variable: CheckInvariantsPayloadSchema

> `const` **CheckInvariantsPayloadSchema**: `object`

Defined in: [command/src/commands/check-invariants.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check-invariants.ts#L40)

The descriptor `outputSchema` for `check-invariants` — hand-written JSON-Schema,
byte-parity-pinned against the parity fixture. The modelled `groups` element
mirrors [InvariantViolationGroup](../interfaces/InvariantViolationGroup.md) (its `violations` mirror
[InvariantViolation](../interfaces/InvariantViolation.md)) so the engine's groups stay assignable and the
schema carries the real element shape. [CheckInvariantsPayload](../type-aliases/CheckInvariantsPayload.md) is its
plain-TS mirror.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.groups

> `readonly` **groups**: `object`

Banned-pattern violations, grouped by the rule that flagged them.

#### properties.groups.items

> `readonly` **items**: `object`

#### properties.groups.items.properties

> `readonly` **properties**: `object`

#### properties.groups.items.properties.message

> `readonly` **message**: `object`

#### properties.groups.items.properties.message.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.groups.items.properties.name

> `readonly` **name**: `object`

#### properties.groups.items.properties.name.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.groups.items.properties.violations

> `readonly` **violations**: `object`

#### properties.groups.items.properties.violations.items

> `readonly` **items**: `object`

#### properties.groups.items.properties.violations.items.properties

> `readonly` **properties**: `object`

#### properties.groups.items.properties.violations.items.properties.content

> `readonly` **content**: `object`

#### properties.groups.items.properties.violations.items.properties.content.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.groups.items.properties.violations.items.properties.file

> `readonly` **file**: `object`

#### properties.groups.items.properties.violations.items.properties.file.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.groups.items.properties.violations.items.properties.line

> `readonly` **line**: `object`

#### properties.groups.items.properties.violations.items.properties.line.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.groups.items.properties.violations.items.required

> `readonly` **required**: readonly \[`"file"`, `"line"`, `"content"`\]

#### properties.groups.items.properties.violations.items.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.groups.items.properties.violations.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.groups.items.required

> `readonly` **required**: readonly \[`"name"`, `"message"`, `"violations"`\]

#### properties.groups.items.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.groups.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.lineEndings

> `readonly` **lineEndings**: `object`

Committed text files whose line endings violate the `.gitattributes` policy.

#### properties.lineEndings.items

> `readonly` **items**: `object`

#### properties.lineEndings.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.lineEndings.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.ok

> `readonly` **ok**: `object`

#### properties.ok.type

> `readonly` **type**: `"boolean"` = `'boolean'`

### required

> `readonly` **required**: readonly \[`"ok"`, `"groups"`, `"lineEndings"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
