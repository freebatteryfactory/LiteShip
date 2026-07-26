[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / StyleBlock

# Interface: StyleBlock

Defined in: vite/dist/style-transform.d.ts:16

Single parsed `@style` block: the style name being referenced, its
per-state CSS property overrides, and provenance.

## Properties

### line

> `readonly` **line**: `number`

Defined in: vite/dist/style-transform.d.ts:24

1-based line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: vite/dist/style-transform.d.ts:22

Absolute source file path.

***

### states

> `readonly` **states**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Defined in: vite/dist/style-transform.d.ts:20

`{ stateName: { cssProp: value } }` mapping.

***

### styleName

> `readonly` **styleName**: `string`

Defined in: vite/dist/style-transform.d.ts:18

Named style (resolved against exported `StyleDef` values).
