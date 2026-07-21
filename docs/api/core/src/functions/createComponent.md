[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createComponent

# Function: createComponent()

> **createComponent**\<`B`, `SN`\>(`config`): `ComponentDef`\<`B`, `SN`\>

Defined in: [core/src/authoring/component.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/component.ts#L61)

Create a [Component](../type-aliases/Component.md) — the content-addressed unit that binds a
[Boundary](../variables/Boundary.md), a [Style](../variables/Style.md), and named slots into a single declaration
compilers can target. The optional boundary gates style variants; the slots
describe the consumer-facing API (verb grammar, ADR-0046 — `create` allocates a
content-addressed unit).

## Type Parameters

### B

`B` *extends* [`Boundary`](../type-aliases/Boundary.md)

### SN

`SN` *extends* readonly \[`string`, `string`\] = readonly \[`"children"`\]

## Parameters

### config

#### boundary?

`B`

#### defaultSlot?

`SN`\[`number`\]

#### name

`string`

#### slots?

`{ readonly [K in string]: SlotConfig }`

Default: an implied single 'children' slot with defaultSlot 'children'.

#### styles

[`Style`](../type-aliases/Style.md)\<`B`\>

## Returns

`ComponentDef`\<`B`, `SN`\>
