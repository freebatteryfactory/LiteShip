[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/migrate](../README.md) / FromMediaQueriesOptions

# Interface: FromMediaQueriesOptions

Defined in: compiler/dist/migrate/types.d.ts:58

Shared shape for the media/container-query adapters: the `state:` name prefix
used when synthesizing boundary state names from parsed thresholds. Adapters
may extend this with their own options; keep this minimal.

## Extended by

- [`FromTailwindThemeOptions`](FromTailwindThemeOptions.md)

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

***

### statePrefix?

> `readonly` `optional` **statePrefix?**: `string`

Defined in: compiler/dist/migrate/types.d.ts:60

Prefix for synthesized boundary state names (e.g. `'bp'` → `bp-0`, `bp-768`).
