[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlumbPayloadSchema

# Variable: PlumbPayloadSchema

> `const` **PlumbPayloadSchema**: `object`

Defined in: [command/src/commands/plumb.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/plumb.ts#L41)

The descriptor `outputSchema` for `plumb` — hand-written JSON-Schema,
byte-parity-pinned against the parity fixture. [PlumbPayload](../type-aliases/PlumbPayload.md) is its
plain-TS mirror.

The `skips` element `kind` mirrors [PlumbSkip.kind](../interfaces/PlumbSkip.md#kind) — the detected skip
TOKEN from the UNIFIED alias-aware detector (`@czap/gauntlet`'s `detectSkips`),
which covers every form a generated test can carry (`it.skip` / `test.skip` /
`describe.skip` / `bench.skip` / `it.todo` / `xit` / the runtime-conditional
`it.skipIf` / `it.runIf` / the `COND ? it : it.skip` alias). It is a free
`string` (not a closed literal union) so a new runner-verb skip form the
detector learns is faithfully surfaced — a generated test must NEVER skip.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.generatedCorpusMessage

> `readonly` **generatedCorpusMessage**: `object`

Human-readable reason when the generated test corpus is missing or empty.

#### properties.generatedCorpusMessage.type

> `readonly` **type**: readonly \[`"string"`, `"null"`\]

#### properties.generatedPresent

> `readonly` **generatedPresent**: `object`

Whether the generated test corpus was present to scan (false ⇒ run capsule:compile).

#### properties.generatedPresent.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.ok

> `readonly` **ok**: `object`

Whether the gate passed (no skips, no unclassified packages).

#### properties.ok.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.skips

> `readonly` **skips**: `object`

Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking.

#### properties.skips.items

> `readonly` **items**: `object`

#### properties.skips.items.properties

> `readonly` **properties**: `object`

#### properties.skips.items.properties.file

> `readonly` **file**: `object`

#### properties.skips.items.properties.file.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.skips.items.properties.kind

> `readonly` **kind**: `object`

#### properties.skips.items.properties.kind.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.skips.items.properties.message

> `readonly` **message**: `object`

#### properties.skips.items.properties.message.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.skips.items.required

> `readonly` **required**: readonly \[`"file"`, `"kind"`, `"message"`\]

#### properties.skips.items.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.skips.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.unclassified

> `readonly` **unclassified**: `object`

Published packages with no PACKAGE_PLUMB classification.

#### properties.unclassified.items

> `readonly` **items**: `object`

#### properties.unclassified.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.unclassified.type

> `readonly` **type**: `"array"` = `'array'`

### required

> `readonly` **required**: readonly \[`"ok"`, `"skips"`, `"unclassified"`, `"generatedPresent"`, `"generatedCorpusMessage"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
