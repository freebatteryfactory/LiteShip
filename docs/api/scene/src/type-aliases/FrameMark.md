[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / FrameMark

# Type Alias: FrameMark

> **FrameMark** = `_FrameMark`

Defined in: [scene/src/contract.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L39)

Timeline mark accepted by track `from` / `to` fields: a raw frame
index, a `Beat(n)` handle resolved against scene BPM/fps at compile
time, or a deferred frame+beat sum (see `sugar/beat.ts`).
