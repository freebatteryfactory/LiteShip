[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / StyleBlock

# Interface: StyleBlock

Defined in: [vite/src/style-transform.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/style-transform.ts#L32)

Single parsed `@style` block: the style name being referenced, its
per-state CSS property overrides, and provenance.

## Properties

### line

> `readonly` **line**: `number`

Defined in: [vite/src/style-transform.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/style-transform.ts#L40)

1-based line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: [vite/src/style-transform.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/style-transform.ts#L38)

Absolute source file path.

***

### states

> `readonly` **states**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Defined in: [vite/src/style-transform.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/style-transform.ts#L36)

`{ stateName: { cssProp: value } }` mapping.

***

### styleName

> `readonly` **styleName**: `string`

Defined in: [vite/src/style-transform.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/style-transform.ts#L34)

Named style (resolved against exported `StyleDef` values).
