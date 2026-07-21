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

#### properties.hermetic

> `readonly` **hermetic**: `object`

The three release-hermeticity sub-results — present ONLY under `--hermetic`
(absent on a plain package-smoke run, so the default receipt is unchanged).
`hermetic-build` (offline reinstall) and `packed-consumer-closure` are
blocking (either failing forces `ok:false`); `double-build-repro` is advisory
(a per-file-hash "semantic" verdict + a byte-identical "artifact" verdict —
artifact drift is reported, never fails the gate).

#### properties.hermetic.properties

> `readonly` **properties**: `object`

#### properties.hermetic.properties.doubleBuildRepro

> `readonly` **doubleBuildRepro**: `object`

#### properties.hermetic.properties.doubleBuildRepro.properties

> `readonly` **properties**: `object`

#### properties.hermetic.properties.doubleBuildRepro.properties.artifactRepro

> `readonly` **artifactRepro**: `object`

#### properties.hermetic.properties.doubleBuildRepro.properties.artifactRepro.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.hermetic.properties.doubleBuildRepro.properties.reportPath

> `readonly` **reportPath**: `object`

#### properties.hermetic.properties.doubleBuildRepro.properties.reportPath.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.hermetic.properties.doubleBuildRepro.properties.semanticRepro

> `readonly` **semanticRepro**: `object`

#### properties.hermetic.properties.doubleBuildRepro.properties.semanticRepro.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.hermetic.properties.doubleBuildRepro.required

> `readonly` **required**: readonly \[`"semanticRepro"`, `"artifactRepro"`, `"reportPath"`\]

#### properties.hermetic.properties.doubleBuildRepro.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.hermetic.properties.hermeticBuild

> `readonly` **hermeticBuild**: `object`

#### properties.hermetic.properties.hermeticBuild.properties

> `readonly` **properties**: `object`

#### properties.hermetic.properties.hermeticBuild.properties.ok

> `readonly` **ok**: `object`

#### properties.hermetic.properties.hermeticBuild.properties.ok.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.hermetic.properties.hermeticBuild.properties.reason

> `readonly` **reason**: `object`

#### properties.hermetic.properties.hermeticBuild.properties.reason.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.hermetic.properties.hermeticBuild.properties.skipped

> `readonly` **skipped**: `object`

#### properties.hermetic.properties.hermeticBuild.properties.skipped.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.hermetic.properties.hermeticBuild.required

> `readonly` **required**: readonly \[`"ok"`, `"skipped"`, `"reason"`\]

#### properties.hermetic.properties.hermeticBuild.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.hermetic.properties.packedConsumerClosure

> `readonly` **packedConsumerClosure**: `object`

#### properties.hermetic.properties.packedConsumerClosure.properties

> `readonly` **properties**: `object`

#### properties.hermetic.properties.packedConsumerClosure.properties.failure

> `readonly` **failure**: `object`

#### properties.hermetic.properties.packedConsumerClosure.properties.failure.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.hermetic.properties.packedConsumerClosure.properties.ok

> `readonly` **ok**: `object`

#### properties.hermetic.properties.packedConsumerClosure.properties.ok.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.hermetic.properties.packedConsumerClosure.properties.subpathCount

> `readonly` **subpathCount**: `object`

#### properties.hermetic.properties.packedConsumerClosure.properties.subpathCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.hermetic.properties.packedConsumerClosure.required

> `readonly` **required**: readonly \[`"ok"`, `"subpathCount"`, `"failure"`\]

#### properties.hermetic.properties.packedConsumerClosure.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.hermetic.required

> `readonly` **required**: readonly \[`"hermeticBuild"`, `"packedConsumerClosure"`, `"doubleBuildRepro"`\]

#### properties.hermetic.type

> `readonly` **type**: readonly \[`"object"`, `"null"`\]

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

Number of `@liteship/*` (+ unscoped) scopes packed via `pnpm pack`.

#### properties.packagesPacked.type

> `readonly` **type**: `"number"` = `'number'`

### required

> `readonly` **required**: readonly \[`"ok"`, `"packagesPacked"`, `"importsSmoked"`, `"failedStep"`, `"failure"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
