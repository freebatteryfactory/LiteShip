[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PackageSmokePayloadSchema

# Variable: PackageSmokePayloadSchema

> `const` **PackageSmokePayloadSchema**: `object`

Defined in: [command/src/commands/package-smoke.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L37)

The descriptor `outputSchema` for `package-smoke` — hand-written JSON-Schema,
byte-parity-pinned against the parity fixture. [PackageSmokePayload](../type-aliases/PackageSmokePayload.md) is
its plain-TS mirror.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.failedStep

> `readonly` **failedStep**: `object`

The bracketed step label of the first failure, or null on success.

#### properties.failedStep.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.failure

> `readonly` **failure**: `object`

The failure message of the first failure, or null on success.

#### properties.failure.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.importsSmoked

> `readonly` **importsSmoked**: `object`

Number of module specifiers the import-smoke resolved (0 when it never ran).

#### properties.importsSmoked.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.ok

> `readonly` **ok**: `object`

#### properties.ok.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.packagesPacked

> `readonly` **packagesPacked**: `object`

Number of `@czap/*` (+ unscoped) scopes packed via `pnpm pack`.

#### properties.packagesPacked.type

> `readonly` **type**: `"number"` = `'number'`

### required

> `readonly` **required**: readonly \[`"ok"`, `"packagesPacked"`, `"importsSmoked"`, `"failedStep"`, `"failure"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
