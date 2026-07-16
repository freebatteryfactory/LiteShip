[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / Result

# Type Alias: Result\<A, E\>

> **Result**\<`A`, `E`\> = [`Ok`](../interfaces/Ok.md)\<`A`\> \| [`Err`](../interfaces/Err.md)\<`E`\>

Defined in: [error/src/result.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/result.ts#L41)

A computed value that is either [Ok](../interfaces/Ok.md)`<A>` or [Err](../interfaces/Err.md)`<E>`. Narrowing
on the `ok` discriminant (or via [isOk](../functions/isOk.md)/[isErr](../functions/isErr.md)) collapses the
union to exactly one arm — the else branch is the other, so a match is
exhaustive by construction.

## Type Parameters

### A

`A`

### E

`E`
