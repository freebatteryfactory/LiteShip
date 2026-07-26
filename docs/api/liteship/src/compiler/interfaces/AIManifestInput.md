[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AIManifestInput

# Interface: AIManifestInput

Defined in: compiler/dist/ai-manifest.d.ts:113

Authoring-time manifest input accepted by every [AIManifestCompiler](../variables/AIManifestCompiler.md)
entry point. All fields are optional; omitted fields default to
`version: '1.0'`, empty records for `dimensions`/`slots`/`actions`, and
`[]` for `constraints`. The normalized [AIManifest](AIManifest.md) (total fields)
is what compile results carry.

## Properties

### actions?

> `readonly` `optional` **actions?**: `Record`\<`string`, [`AIAction`](AIAction.md)\>

Defined in: compiler/dist/ai-manifest.d.ts:121

Invocable actions; defaults to `{}`.

***

### constraints?

> `readonly` `optional` **constraints?**: readonly [`AIConstraint`](AIConstraint.md)[]

Defined in: compiler/dist/ai-manifest.d.ts:123

Cross-cutting invariants; defaults to `[]`.

***

### dimensions?

> `readonly` `optional` **dimensions?**: `Record`\<`string`, [`AIDimension`](AIDimension.md)\>

Defined in: compiler/dist/ai-manifest.d.ts:117

State-space dimensions; defaults to `{}`.

***

### slots?

> `readonly` `optional` **slots?**: `Record`\<`string`, [`AISlot`](AISlot.md)\>

Defined in: compiler/dist/ai-manifest.d.ts:119

Content slots; defaults to `{}`.

***

### version?

> `readonly` `optional` **version?**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:115

Manifest schema version; defaults to `'1.0'`.
