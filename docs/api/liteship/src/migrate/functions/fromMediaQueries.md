[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/migrate](../README.md) / fromMediaQueries

# Function: fromMediaQueries()

> **fromMediaQueries**(`css`, `options?`): [`MigrationResult`](../interfaces/MigrationResult.md)

Defined in: compiler/dist/migrate/from-media-queries.d.ts:53

Lower a foreign `@media` stylesheet into `@liteship/core` definitions.

Produces one boundary per faithfully resolved dimensional input (the built-in
viewport inputs for px/unitless-zero; host-resolved inputs for em/rem), one two-state boundary per
distinct discrete feature, and one light/dark `defineTheme` when any
`prefers-color-scheme` block is present. Every lossy or dropped construct is
recorded as a [MigrationDiagnostic](../interfaces/MigrationDiagnostic.md) instead of throwing.

## Parameters

### css

`string`

### options?

[`FromMediaQueriesOptions`](../interfaces/FromMediaQueriesOptions.md)

## Returns

[`MigrationResult`](../interfaces/MigrationResult.md)

## Example

```ts
const { boundaries } = fromMediaQueries(`
  @media (min-width: 768px)  { .card { padding: 2rem; } }
  @media (min-width: 1280px) { .card { padding: 4rem; } }
`);
// boundaries[0].input === 'viewport.width'
// boundaries[0].states === ['base', 'tablet', 'desktop']
// boundaries[0].thresholds === [0, 768, 1280]
```
