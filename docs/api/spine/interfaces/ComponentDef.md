[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ComponentDef

# Interface: ComponentDef

Defined in: [\_spine/genui.d.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/genui.d.ts#L22)

Catalog component definition — props and child constraints.

## Properties

### allowedChildNames?

> `readonly` `optional` **allowedChildNames?**: readonly `string`[]

Defined in: [\_spine/genui.d.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/genui.d.ts#L25)

***

### children?

> `readonly` `optional` **children?**: `"none"` \| `"optional"` \| `"required"`

Defined in: [\_spine/genui.d.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/genui.d.ts#L24)

***

### props

> `readonly` **props**: `Readonly`\<`Record`\<`string`, [`ComponentPropDef`](ComponentPropDef.md)\>\>

Defined in: [\_spine/genui.d.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/genui.d.ts#L23)

***

### tag?

> `readonly` `optional` **tag?**: `string`

Defined in: [\_spine/genui.d.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/genui.d.ts#L27)

DOM tag used by the trusted renderer (defaults to `div`).
