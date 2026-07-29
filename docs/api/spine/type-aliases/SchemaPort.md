[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / SchemaPort

# Type Alias: SchemaPort\<A, I\>

> **SchemaPort**\<`A`, `I`\> = `object`

Defined in: [\_spine/core.d.ts:1487](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1487)

The permanent schema contract: the phantom `Type`/`Encoded` pair every schema
value carries (`A` decodes out, `I` is the encoded form). Structural, so an
effect `Schema`/`Codec` value and a kernel schema both satisfy it — the spine
names this instead of effect's `Schema` (spine-first: the spine is the canonical
type source, so shared contracts land here before an implementation re-exports them).

## Type Parameters

### A

`A`

### I

`I` = `A`

## Properties

### Encoded

> `readonly` **Encoded**: `I`

Defined in: [\_spine/core.d.ts:1489](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1489)

***

### Type

> `readonly` **Type**: `A`

Defined in: [\_spine/core.d.ts:1488](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1488)
