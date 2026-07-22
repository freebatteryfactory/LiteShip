[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / NativeTimelineEligibility

# Type Alias: NativeTimelineEligibility

> **NativeTimelineEligibility** = \{ `eligible`: `true`; \} \| \{ `eligible`: `false`; `reason`: `"mixed-easing-overlap"`; \}

Defined in: [core/src/motion/interpret-transition.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L82)

Whether this plan may OWN a native CSS `animation-timeline` (a scroll/view
`animation-name` binding). A single transition and a UNIFORM-easing composed program
are `eligible` — one native `@keyframes` renders them faithfully. A composed program
whose OVERLAPPING windows disagree on easing (a `par` of differently-eased children,
#148) is NOT: no single native `@keyframes` timing-function can serve both curves over
their shared segment, so a native timeline would silently render the wrong easing. The
LOWERER decides this — it alone sees the overlapping windows and their curves — and
records it here as DATA, so the compiler never has to guess eligibility from the
keyframe stops (an absent per-keyframe easing is ambiguous: it can also mean ordinary
default `ease`). When `eligible: false` the compiler emits NO native ownership block,
so `getComputedStyle(el).animationName` carries no `liteship-motion-*` name and the
per-window RUNTIME floor (`client:motion`, which samples each window at its OWN easing)
stays the faithful renderer (ADR-0041).
