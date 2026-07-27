[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/migrate](../README.md) / fromContainerQueries

# Function: fromContainerQueries()

> **fromContainerQueries**(`css`, `options?`): [`MigrationResult`](../interfaces/MigrationResult.md)

Defined in: compiler/dist/migrate/from-container-queries.d.ts:47

Lower native CSS `@container` query blocks into `defineBoundary` definitions.

Every top-level `@container [name] (<condition>) { … }` block is reduced to
a single-axis width/height range. The caller must preserve container identity
by resolving each name/axis pair onto an explicit LiteShip input. Blocks sharing an
axis range-merge into one boundary whose ascending thresholds are the blocks'
lower bounds. State names are synthesized as `<statePrefix>-<threshold>`
(default prefix `bp`). Lossy/dropped cases are accumulated as diagnostics; a
`defineBoundary` `ValidationError` is caught and surfaced as an `error`
diagnostic rather than thrown.

## Parameters

### css

`string`

### options?

`FromContainerQueriesOptions`

## Returns

[`MigrationResult`](../interfaces/MigrationResult.md)

## Example

```ts
const { boundaries } = fromContainerQueries(`
  @container card (min-width: 0) { .card { grid-template-columns: 1fr; } }
  @container card (min-width: 768px) { .card { grid-template-columns: 1fr 1fr; } }
  @container card (min-width: 1024px) { .card { grid-template-columns: 1fr 1fr 1fr; } }
`, {
  resolveInput: ({ name, axis }) => `custom:container.${name}.${axis}`,
});
// boundaries[0].input === 'custom:container.card.width'
// boundaries[0].thresholds === [0, 768, 1024]
// boundaries[0].states === ['bp-0', 'bp-768', 'bp-1024']
```
