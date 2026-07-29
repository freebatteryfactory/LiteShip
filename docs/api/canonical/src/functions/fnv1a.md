[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [canonical/src](../README.md) / fnv1a

# Function: fnv1a()

> **fnv1a**(`str`): `` `fnv1a:${string}` ``

Defined in: [canonical/src/fnv.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/fnv.ts#L19)

FNV-1a label of a string's UTF-8 bytes.

This is the string convenience projection of [fnv1aBytes](fnv1aBytes.md); it does
not hash JavaScript UTF-16 code units. Therefore the same authored text and
its explicit UTF-8 byte sequence cannot silently mint different labels.

## Parameters

### str

`string`

## Returns

`` `fnv1a:${string}` ``
