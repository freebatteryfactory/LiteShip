[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LiveCell

# Variable: LiveCell

> `const` **LiveCell**: `object`

Defined in: [core/src/reactive/live-cell.ts:270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/live-cell.ts#L270)

LiveCell — bridge between the [Cell](Cell.md) reactive graph and the wire
protocol. A `LiveCell` wraps a `Cell` with a typed [CellEnvelope](../interfaces/CellEnvelope.md) — kind,
content address, HLC, boundary crossings — so primitives can travel between
peers as self-describing messages.

## Type Declaration

### make

> **make**: \<`K`, `T`\>(`kind`, `initial`, `clock`) => `LiveCellShape`\<`K`, `T`\> = `_make`

Wrap an arbitrary value in a LiveCell with freshly minted identity + HLC.
`clock` (default [wallClock](wallClock.md)) is the injected time source for the envelope
HLC — pass a `manualClock`/`fixedClock` for deterministic replay.

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

##### clock?

[`Clock`](../interfaces/Clock.md) = `wallClock`

#### Returns

`LiveCellShape`\<`K`, `T`\>

### makeBoundary

> **makeBoundary**: \<`I`, `S`\>(`boundary`, `initial`, `clock`) => `LiveCellShape`\<`"boundary"`, `number`\> = `_makeBoundary`

Specialized factory for boundary crossings so the envelope captures crossing
metadata. `clock` (default [wallClock](wallClock.md)) is the injected time source for the
envelope HLC and crossing timestamps — pass a manual/fixed clock for determinism.

Create a boundary-kind LiveCell that automatically publishes crossings when the
numeric value transitions between boundary states.

#### Type Parameters

##### I

`I` *extends* `string`

##### S

`S` *extends* readonly \[`string`, `string`\]

#### Parameters

##### boundary

[`Boundary`](../type-aliases/Boundary.md)\<`I`, `S`\>

##### initial

`number`

##### clock?

[`Clock`](../interfaces/Clock.md) = `wallClock`

#### Returns

`LiveCellShape`\<`"boundary"`, `number`\>
