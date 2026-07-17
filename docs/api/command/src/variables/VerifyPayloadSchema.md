[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / VerifyPayloadSchema

# Variable: VerifyPayloadSchema

> `const` **VerifyPayloadSchema**: `object`

Defined in: [command/src/commands/verify.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L28)

The descriptor `outputSchema` — hand-written JSON-Schema, byte-parity-pinned
against the parity fixture. The four forward-compat `checks` are a nested struct
(only `tarball_manifest` is exercised in v0.1.0) so the validator recurses into
the real per-check enums, not a bare `{type:'object'}`.

`capsule_id` is described as a nullable string (its on-the-wire shape — a
`ContentAddress` is a branded string with no JSON-Schema image); the exported
[VerifyPayload](../type-aliases/VerifyPayload.md) re-tightens that single field to the `ContentAddress |
null` brand consumers expect.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.capsule\_id

> `readonly` **capsule\_id**: `object`

#### properties.capsule\_id.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.checks

> `readonly` **checks**: `object`

#### properties.checks.properties

> `readonly` **properties**: `object`

#### properties.checks.properties.chain\_link

> `readonly` **chain\_link**: `object`

#### properties.checks.properties.chain\_link.const

> `readonly` **const**: `"skipped"` = `'skipped'`

#### properties.checks.properties.lockfile

> `readonly` **lockfile**: `object`

#### properties.checks.properties.lockfile.const

> `readonly` **const**: `"skipped"` = `'skipped'`

#### properties.checks.properties.tarball\_manifest

> `readonly` **tarball\_manifest**: `object`

#### properties.checks.properties.tarball\_manifest.enum

> `readonly` **enum**: readonly \[`"match"`, `"mismatch"`, `"skipped"`\]

#### properties.checks.properties.workspace\_manifest

> `readonly` **workspace\_manifest**: `object`

#### properties.checks.properties.workspace\_manifest.const

> `readonly` **const**: `"skipped"` = `'skipped'`

#### properties.checks.required

> `readonly` **required**: readonly \[`"tarball_manifest"`, `"lockfile"`, `"workspace_manifest"`, `"chain_link"`\]

#### properties.checks.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.mismatches

> `readonly` **mismatches**: `object`

#### properties.mismatches.items

> `readonly` **items**: `object`

#### properties.mismatches.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.mismatches.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.tarball

> `readonly` **tarball**: `object`

#### properties.tarball.type

> `readonly` **type**: `"string"` = `'string'`

### required

> `readonly` **required**: readonly \[`"tarball"`, `"capsule_id"`, `"checks"`, `"mismatches"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
