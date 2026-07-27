[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / MotionFrameSample

# Interface: MotionFrameSample

Defined in: [stage/src/motion-export.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L24)

One sampled motion frame: its index, its normalized `t`, and the typed + formatted leaves.

## Properties

### css

> `readonly` **css**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [stage/src/motion-export.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L32)

The same leaves formatted for frame content (what the encoded video/CSS actually carries).

***

### frame

> `readonly` **frame**: `number`

Defined in: [stage/src/motion-export.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L26)

Frame index in `[0, totalFrames)`.

***

### t

> `readonly` **t**: `number`

Defined in: [stage/src/motion-export.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L28)

Normalized program time `frame / max(1, totalFrames-1)` — endpoint-inclusive.

***

### values

> `readonly` **values**: `ReadonlyMap`\<`string`, [`TypedValue`](../../../liteship/src/motion/type-aliases/TypedValue.md)\>

Defined in: [stage/src/motion-export.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L30)

Typed leaf values (the oracle compares these against the `sampleProgram` reference).
