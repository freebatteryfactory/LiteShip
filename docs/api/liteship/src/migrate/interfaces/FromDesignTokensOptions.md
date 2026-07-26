[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/migrate](../README.md) / FromDesignTokensOptions

# Interface: FromDesignTokensOptions

Defined in: compiler/dist/migrate/from-design-tokens.d.ts:48

Options for [fromDesignTokens](../functions/fromDesignTokens.md).

## Properties

### modes?

> `readonly` `optional` **modes?**: readonly `string`[]

Defined in: compiler/dist/migrate/from-design-tokens.d.ts:55

The mode axis a token's `$value` object may be keyed by — a token whose
`$value` is an object with every key in this set lowers to a
`defineTheme` variant rather than a `defineToken`. Default
`['light', 'dark']`.

***

### themeName?

> `readonly` `optional` **themeName?**: `string`

Defined in: compiler/dist/migrate/from-design-tokens.d.ts:57

Name for the single emitted `defineTheme`. Default `'migrated-theme'`.
