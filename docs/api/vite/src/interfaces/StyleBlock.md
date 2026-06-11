[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / StyleBlock

# Interface: StyleBlock

Defined in: [vite/src/style-transform.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/style-transform.ts#L31)

Single parsed `@style` block: the style name being referenced, its
per-state CSS property overrides, and provenance.

## Properties

### line

> `readonly` **line**: `number`

Defined in: [vite/src/style-transform.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/style-transform.ts#L39)

1-based line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: [vite/src/style-transform.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/style-transform.ts#L37)

Absolute source file path.

***

### states

> `readonly` **states**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Defined in: [vite/src/style-transform.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/style-transform.ts#L35)

`{ stateName: { cssProp: value } }` mapping.

***

### styleName

> `readonly` **styleName**: `string`

Defined in: [vite/src/style-transform.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/style-transform.ts#L33)

Named style (resolved against exported `StyleDef` values).
