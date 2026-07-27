[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SchemaPort

# Type Alias: SchemaPort\<A, I\>

> **SchemaPort**\<`A`, `I`\> = `object`

Defined in: [\_spine/core.d.ts:1270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1270)

The permanent schema contract: the phantom `Type`/`Encoded` pair every schema
value carries (`A` decodes out, `I` is the encoded form). Structural, so an
effect `Schema`/`Codec` value and a kernel schema both satisfy it — the spine
names this instead of effect's `Schema` (ADR-0010, spine-first).

## Type Parameters

### A

`A`

### I

`I` = `A`

## Properties

### Encoded

> `readonly` **Encoded**: `I`

Defined in: [\_spine/core.d.ts:1272](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1272)

***

### Type

> `readonly` **Type**: `A`

Defined in: [\_spine/core.d.ts:1271](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1271)
