[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / MotionFrameSample

# Interface: MotionFrameSample

Defined in: [stage/src/motion-export.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L23)

One sampled motion frame: its index, its normalized `t`, and the typed + formatted leaves.

## Properties

### css

> `readonly` **css**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [stage/src/motion-export.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L31)

The same leaves formatted for frame content (what the encoded video/CSS actually carries).

***

### frame

> `readonly` **frame**: `number`

Defined in: [stage/src/motion-export.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L25)

Frame index in `[0, totalFrames)`.

***

### t

> `readonly` **t**: `number`

Defined in: [stage/src/motion-export.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L27)

Normalized program time `frame / max(1, totalFrames-1)` — endpoint-inclusive.

***

### values

> `readonly` **values**: `ReadonlyMap`\<`string`, `TypedValue`\>

Defined in: [stage/src/motion-export.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L29)

Typed leaf values (the oracle compares these against the `sampleProgram` reference).
