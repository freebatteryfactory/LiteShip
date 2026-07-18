[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / ResolvedEnvelope

# Type Alias: ResolvedEnvelope

> **ResolvedEnvelope** = `_ResolvedEnvelope`

Defined in: [scene/src/sugar/envelope.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/sugar/envelope.ts#L39)

Compile-time-resolved envelope — the `Envelope` ECS component shape.
Beat spans are pre-resolved to frame counts so the per-tick read is
arithmetic-only (ADR-0002). Mirror of the `@czap/_spine` declaration.
