[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/migrate](../README.md) / fromTailwindTheme

# Function: fromTailwindTheme()

> **fromTailwindTheme**(`css`, `options?`): [`MigrationResult`](../interfaces/MigrationResult.md)

Defined in: compiler/dist/migrate/from-tailwind-theme.d.ts:66

Lower a Tailwind v4 `@theme { }` block into `@liteship/core` definitions.

Produces one `defineToken` per recovered token (numeric scale steps folded into
a single `scale`-axis token) and, when any `--breakpoint-*` custom property or
`screens` option is present, one ascending `viewport.width` `defineBoundary`. Every
lossy (`var()`/`calc()` reference), unclassifiable (unknown namespace), or
dropped (constructor rejection) construct is recorded as a
[MigrationDiagnostic](../interfaces/MigrationDiagnostic.md) instead of throwing.

## Parameters

### css

`string`

### options?

[`FromTailwindThemeOptions`](../interfaces/FromTailwindThemeOptions.md)

## Returns

[`MigrationResult`](../interfaces/MigrationResult.md)

## Example

```ts
const { tokens, boundaries } = fromTailwindTheme(`
  @theme {
    --color-primary-500: #6366f1;
    --color-primary-700: #4338ca;
    --spacing-sm: 0.5rem;
    --breakpoint-md: 768px;
  }
`);
// tokens[0]: name 'color-primary', category 'color', axes ['scale'],
//            values { '500': '#6366f1', '700': '#4338ca' }
// boundaries[0]: input 'viewport.width', thresholds [0, 768]
```
