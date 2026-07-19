[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LiveCell

# Variable: LiveCell

> `const` **LiveCell**: `object`

Defined in: [core/src/live-cell.ts:231](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/live-cell.ts#L231)

LiveCell — bridge between the [Cell](Cell.md) reactive graph and the wire
protocol. A `LiveCell` wraps a `Cell` with a typed [CellEnvelope](../interfaces/CellEnvelope.md) — kind,
content address, HLC, boundary crossings — so primitives can travel between
peers as self-describing messages.

## Type Declaration

### make

> **make**: \<`K`, `T`\>(`kind`, `initial`) => `LiveCellShape`\<`K`, `T`\> = `_make`

Wrap an arbitrary value in a LiveCell with freshly minted identity + HLC.

#### Type Parameters

##### K

`K` *extends* [`CellKind`](../type-aliases/CellKind.md)

##### T

`T`

#### Parameters

##### kind

`K`

##### initial

`T`

#### Returns

`LiveCellShape`\<`K`, `T`\>

### makeBoundary

> **makeBoundary**: \<`I`, `S`\>(`boundary`, `initial`) => `LiveCellShape`\<`"boundary"`, `number`\> = `_makeBoundary`

Specialized factory for boundary crossings so the envelope captures crossing metadata.

Create a boundary-kind LiveCell that automatically publishes crossings when the
numeric value transitions between boundary states.

#### Type Parameters

##### I

`I` *extends* `string`

##### S

`S` *extends* readonly \[`string`, `string`\]

#### Parameters

##### boundary

[`Shape`](../namespaces/Boundary/type-aliases/Shape.md)\<`I`, `S`\>

##### initial

`number`

#### Returns

`LiveCellShape`\<`"boundary"`, `number`\>
