[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / SlotEntryInput

# Interface: SlotEntryInput

Defined in: web/dist/types.d.ts:44

Input accepted by `SlotRegistryShape.register`. Registered entries are
normalized to a full [SlotEntry](SlotEntry.md): `mode` defaults to `'partial'`
and `mounted` defaults to `true`.

## Properties

### element

> `readonly` **element**: `Element`

Defined in: web/dist/types.d.ts:46

***

### mode?

> `readonly` `optional` **mode?**: [`IslandMode`](../type-aliases/IslandMode.md)

Defined in: web/dist/types.d.ts:47

***

### mounted?

> `readonly` `optional` **mounted?**: `boolean`

Defined in: web/dist/types.d.ts:48

***

### path

> `readonly` **path**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: web/dist/types.d.ts:45
