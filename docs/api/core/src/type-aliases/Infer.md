[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Infer

# Type Alias: Infer\<S\>

> **Infer**\<`S`\> = `S` *extends* `object` ? `A` : `never`

Defined in: [core/src/schema/infer.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/infer.ts#L31)

The decoded type of a schema (or any `SchemaPort`-shaped value): its `Type`
phantom. Optional-key remapping, brand nominality (`ContentAddress`), the
bytes carrier instance, and `hole<A> ⇒ A` are all already stamped into that
member by the constructor, so this read surfaces them directly.

## Type Parameters

### S

`S`
