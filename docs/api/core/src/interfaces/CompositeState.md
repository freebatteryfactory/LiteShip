[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CompositeState

# Interface: CompositeState

Defined in: [core/src/compositor.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/compositor.ts#L78)

Snapshot of the compositor's output per tick: discrete state names for each
quantizer, their blend-weight vectors, and the compiled per-target output
maps (`css` / `glsl` / `wgsl` / `aria`).

`wgsl` mirrors `glsl` (a per-quantizer numeric channel keyed by the
quantizer's bare snake_case projection key). D0 carries the channel through
the state shape, the pool, and the worker emit; D1-WGSL adds the live
`emit-wgsl` runtime phase (below) that populates it from the state index,
escalation-gated on the `wgsl` target (admitted only at the `gpu` rung).

## Properties

### blend

> `readonly` **blend**: `Record`\<`string`, `Record`\<`string`, `number`\>\>

Defined in: [core/src/compositor.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/compositor.ts#L80)

***

### discrete

> `readonly` **discrete**: `Record`\<`string`, `string`\>

Defined in: [core/src/compositor.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/compositor.ts#L79)

***

### outputs

> `readonly` **outputs**: `object`

Defined in: [core/src/compositor.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/compositor.ts#L81)

#### aria

> `readonly` **aria**: `Record`\<`string`, `string`\>

#### css

> `readonly` **css**: `Record`\<`string`, `number` \| `string`\>

#### glsl

> `readonly` **glsl**: `Record`\<`string`, `number`\>

#### wgsl

> `readonly` **wgsl**: `Record`\<`string`, `number`\>
