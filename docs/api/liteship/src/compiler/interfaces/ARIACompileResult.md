[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / ARIACompileResult

# Interface: ARIACompileResult\<S\>

Defined in: compiler/dist/aria.d.ts:19

Output of [ARIACompiler.compile](../variables/ARIACompiler.md#compile).

`stateAttributes` is the full lookup keyed by state, ready for direct
spreading when the boundary transitions. `currentAttributes` is a
convenience pre-resolved for the active state so SSR can emit it
immediately without duplicating the lookup.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### currentAttributes

> `readonly` **currentAttributes**: `Record`\<`string`, `string`\>

Defined in: compiler/dist/aria.d.ts:23

Attributes for the active state at compile time.

***

### stateAttributes

> `readonly` **stateAttributes**: `Record`\<`S`, `Record`\<`string`, `string`\>\>

Defined in: compiler/dist/aria.d.ts:21

Validated per-state ARIA attribute maps.
