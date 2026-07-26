[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/migrate](../README.md) / fromDesignTokens

# Function: fromDesignTokens()

> **fromDesignTokens**(`json`, `options?`): [`MigrationResult`](../interfaces/MigrationResult.md)

Defined in: compiler/dist/migrate/from-design-tokens.d.ts:105

Lower a W3C / DTCG design-token document into `@liteship/core` definitions.

Produces one `defineToken` per plain token (name = the dotted group path),
and at most one `defineTheme` collecting every mode token (a token whose
`$value` is keyed by the configured mode set). Never emits boundaries (there is
no dimensional signal in a token document). Every lossy / dropped / incomplete
construct is recorded as a [MigrationDiagnostic](../interfaces/MigrationDiagnostic.md) instead of throwing.

## Parameters

### json

`unknown`

### options?

[`FromDesignTokensOptions`](../interfaces/FromDesignTokensOptions.md)

## Returns

[`MigrationResult`](../interfaces/MigrationResult.md)

## Example

```ts
const { tokens } = fromDesignTokens({
  color: { primary: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, .4, .8] } } },
  space: { sm: { $type: 'dimension', $value: { value: 8, unit: 'px' } } },
});
// tokens[0].name === 'color.primary'; tokens[0].category === 'color'
// tokens[1].name === 'space.sm';      tokens[1].category === 'spacing'
```
