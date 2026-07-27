[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / SceneDriver

# Interface: SceneDriver

Defined in: core/dist/harness/scene-composition.d.ts:105

Everything the harness needs to drive a concrete scene through its ECS
runtime: the import for its `compileScene`-able function, the SceneRuntime
import, the canonical content-address import, and the declared facts the
dispositions branch on (track kinds present, p95 budget). Resolved by the
driver (`scripts/capsule-compile.ts`) from a scene-driver registry — the
sceneComposition equivalent of the cachedProjection fixture resolution.

## Properties

### capsuleImport

> `readonly` **capsuleImport**: `string`

Defined in: core/dist/harness/scene-composition.d.ts:113

ESM import specifier (with `.js`) for the capsule binding's module.

***

### capsuleName

> `readonly` **capsuleName**: `string`

Defined in: core/dist/harness/scene-composition.d.ts:111

Exported name of the sceneComposition capsule binding (e.g. `intro`).

***

### compileImport

> `readonly` **compileImport**: `string`

Defined in: core/dist/harness/scene-composition.d.ts:109

ESM import specifier (with `.js`) for the compile function's module.

***

### compileName

> `readonly` **compileName**: `string`

Defined in: core/dist/harness/scene-composition.d.ts:107

Exported name of the `() => CompiledScene` function (e.g. `compileIntro`).

***

### contentAddressImport

> `readonly` **contentAddressImport**: `string`

Defined in: core/dist/harness/scene-composition.d.ts:119

Import specifier (with `.js`) for the canonical `contentAddressOf`.

***

### hasAudio

> `readonly` **hasAudio**: `boolean`

Defined in: core/dist/harness/scene-composition.d.ts:121

Whether the scene declares at least one audio track (gates sync-accuracy).

***

### hasVideo

> `readonly` **hasVideo**: `boolean`

Defined in: core/dist/harness/scene-composition.d.ts:123

Whether the scene declares at least one video track (gates sync-accuracy).

***

### partsImport

> `readonly` **partsImport**: `string`

Defined in: core/dist/harness/scene-composition.d.ts:117

Import specifier (with `.js`) for the canonical Scene Part identities.

***

### runtimeImport

> `readonly` **runtimeImport**: `string`

Defined in: core/dist/harness/scene-composition.d.ts:115

Import specifier (with `.js`) for the module exporting `SceneRuntime`.
