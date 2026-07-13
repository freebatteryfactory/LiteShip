[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CssKeyframeStep

# Interface: CssKeyframeStep

Defined in: [core/src/interpret-transition.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L37)

A single CSS keyframe step for sequential routing.

## Properties

### easing?

> `readonly` `optional` **easing?**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/interpret-transition.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L51)

The easing curve governing the SEGMENT that starts at this stop (until the next
stop), emitted as a per-keyframe `animation-timing-function`. Present ONLY on a
MIXED-easing composed program, where one animation-level timing function cannot
serve every segment — a native `animation-timeline` browser would otherwise sample
every segment with one curve while the JS/stage/worker floors use the per-window
curves. Absent on uniform-easing plans (the animation-level curve covers them) and
on single-step transitions; also absent — with a loud `interpretProgram` diagnostic —
on a segment where overlapping windows disagree on easing (a `par` of differently-eased
children), which no single per-keyframe curve can express.

***

### offset

> `readonly` **offset**: `number`

Defined in: [core/src/interpret-transition.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L38)

***

### properties

> `readonly` **properties**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [core/src/interpret-transition.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L39)
