[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/migrate](../README.md) / FromTailwindThemeOptions

# Interface: FromTailwindThemeOptions

Defined in: compiler/dist/migrate/from-tailwind-theme.d.ts:37

Options for [fromTailwindTheme](../functions/fromTailwindTheme.md). Extends the shared media-query options
(`statePrefix`, used for synthesized breakpoint state names) with an explicit
`screens` map for configs that carry breakpoints outside the `@theme` block.

## Extends

- [`FromMediaQueriesOptions`](FromMediaQueriesOptions.md)

## Properties

### resolveLengthInput?

> `readonly` `optional` **resolveLengthInput?**: (`request`) => `string` \| `undefined`

Defined in: compiler/dist/migrate/types.d.ts:66

Resolve a relative media-query length onto a host signal measured in that
exact authored unit. Pixel and unitless-zero queries keep the built-in
viewport input and do not call this hook.

#### Parameters

##### request

`MediaLengthInputRequest`

#### Returns

`string` \| `undefined`

#### Inherited from

[`FromMediaQueriesOptions`](FromMediaQueriesOptions.md).[`resolveLengthInput`](FromMediaQueriesOptions.md#resolvelengthinput)

***

### screens?

> `readonly` `optional` **screens?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: compiler/dist/migrate/from-tailwind-theme.d.ts:39

Explicit `name → length` screen map (e.g. `{ sm: '640px', md: '768px' }`); merged over `--breakpoint-*`.

***

### statePrefix?

> `readonly` `optional` **statePrefix?**: `string`

Defined in: compiler/dist/migrate/types.d.ts:60

Prefix for synthesized boundary state names (e.g. `'bp'` → `bp-0`, `bp-768`).

#### Inherited from

[`FromMediaQueriesOptions`](FromMediaQueriesOptions.md).[`statePrefix`](FromMediaQueriesOptions.md#stateprefix)
