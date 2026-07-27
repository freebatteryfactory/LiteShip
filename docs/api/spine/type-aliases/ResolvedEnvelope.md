[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ResolvedEnvelope

# Type Alias: ResolvedEnvelope

> **ResolvedEnvelope** = \{ `curve`: `"linear-in"` \| `"linear-out"`; `spanFrames`: `number`; \} \| \{ `amplitude`: `number`; `curve`: `"pulse"`; `periodFrames`: `number`; \}

Defined in: [\_spine/scene.d.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L100)

Compile-time-resolved envelope — the `Envelope` ECS component shape
emitted by `compileScene`. Beat spans are pre-resolved to frame
counts so the per-tick read stays arithmetic-only (ADR-0002).

## Union Members

### Type Literal

\{ `curve`: `"linear-in"` \| `"linear-out"`; `spanFrames`: `number`; \}

#### curve

> `readonly` **curve**: `"linear-in"` \| `"linear-out"`

Curve kind — linear-in or linear-out.

#### spanFrames

> `readonly` **spanFrames**: `number`

Fade span in frames.

***

### Type Literal

\{ `amplitude`: `number`; `curve`: `"pulse"`; `periodFrames`: `number`; \}

#### amplitude

> `readonly` **amplitude**: `number`

Peak amplitude above the 1.0 baseline.

#### curve

> `readonly` **curve**: `"pulse"`

Curve kind — pulse.

#### periodFrames

> `readonly` **periodFrames**: `number`

Pulse period in frames.
