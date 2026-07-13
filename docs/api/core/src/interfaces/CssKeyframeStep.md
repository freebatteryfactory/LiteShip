[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CssKeyframeStep

# Interface: CssKeyframeStep

Defined in: [core/src/interpret-transition.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L37)

A single CSS keyframe step for sequential routing.

## Properties

### easing?

> `readonly` `optional` **easing?**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/interpret-transition.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L52)

The easing curve governing the SEGMENT that starts at this stop (until the next
stop), emitted as a per-keyframe `animation-timing-function`. Present on a composed
program that uses any NON-DEFAULT easing, where the animation-level timing function
(which the compiler defaults to `ease`) cannot serve the segment — a native
`animation-timeline` browser would otherwise sample it as `ease` while the
JS/stage/worker floors use the authored curve (uniform or mixed). Absent on
default-`ease` plans (the compiler default already matches) and on single-step
transitions; also absent — with a loud `interpretProgram` diagnostic — on a segment
where overlapping windows disagree on easing (a `par` of differently-eased children),
which no single per-keyframe curve can express.

***

### offset

> `readonly` **offset**: `number`

Defined in: [core/src/interpret-transition.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L38)

***

### properties

> `readonly` **properties**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [core/src/interpret-transition.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L39)
