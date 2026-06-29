[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / AIManifestInput

# Interface: AIManifestInput

Defined in: [compiler/src/ai-manifest.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L124)

Authoring-time manifest input accepted by every [AIManifestCompiler](../variables/AIManifestCompiler.md)
entry point. All fields are optional; omitted fields default to
`version: '1.0'`, empty records for `dimensions`/`slots`/`actions`, and
`[]` for `constraints`. The normalized [AIManifest](AIManifest.md) (total fields)
is what compile results carry.

## Properties

### actions?

> `readonly` `optional` **actions?**: `Record`\<`string`, [`AIAction`](AIAction.md)\>

Defined in: [compiler/src/ai-manifest.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L132)

Invocable actions; defaults to `{}`.

***

### constraints?

> `readonly` `optional` **constraints?**: readonly [`AIConstraint`](AIConstraint.md)[]

Defined in: [compiler/src/ai-manifest.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L134)

Cross-cutting invariants; defaults to `[]`.

***

### dimensions?

> `readonly` `optional` **dimensions?**: `Record`\<`string`, [`AIDimension`](AIDimension.md)\>

Defined in: [compiler/src/ai-manifest.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L128)

State-space dimensions; defaults to `{}`.

***

### slots?

> `readonly` `optional` **slots?**: `Record`\<`string`, [`AISlot`](AISlot.md)\>

Defined in: [compiler/src/ai-manifest.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L130)

Content slots; defaults to `{}`.

***

### version?

> `readonly` `optional` **version?**: `string`

Defined in: [compiler/src/ai-manifest.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L126)

Manifest schema version; defaults to `'1.0'`.
