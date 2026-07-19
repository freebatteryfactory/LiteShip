[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CssKeyframeStep

# Interface: CssKeyframeStep

Defined in: [core/src/motion/interpret-transition.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L37)

A single CSS keyframe step for sequential routing.

## Properties

### easing?

> `readonly` `optional` **easing?**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/motion/interpret-transition.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L58)

The easing curve governing the SEGMENT that starts at this stop (until the next
stop), emitted as a per-keyframe `animation-timing-function`. Present on a composed
program that uses any NON-DEFAULT easing, where the animation-level timing function
(which the compiler defaults to `ease`) cannot serve the segment — a native
`animation-timeline` browser would otherwise sample it as `ease` while the
JS/stage/worker floors use the authored curve (uniform or mixed). Absent on
default-`ease` plans (the compiler default already matches) and on single-step
transitions; also absent on a segment where overlapping windows disagree on easing (a
`par` of differently-eased children), which no single per-keyframe curve can express —
that composed case is rendered exactly by the per-window RUNTIME floor
([RuntimeWriteWindow.easing](RuntimeWriteWindow.md#easing)), the native single-`@keyframes` leg being reserved
for single transitions and uniform-easing programs (#148, no approximation diagnostic).

When present, the descriptor may carry a serialized `points` arm (a widened-catalog
curve, e.g. `easeOutBounce`) which the compiler emits verbatim as a `linear()` timing
function — the SAME stop list the JS floor lerps (Law 4, the byte-law).

***

### offset

> `readonly` **offset**: `number`

Defined in: [core/src/motion/interpret-transition.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L38)

***

### properties

> `readonly` **properties**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [core/src/motion/interpret-transition.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L39)
