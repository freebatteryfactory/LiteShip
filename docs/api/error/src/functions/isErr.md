[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / isErr

# Function: isErr()

> **isErr**\<`A`, `E`\>(`result`): `result is Err<E>`

Defined in: [error/src/result.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/result.ts#L53)

Narrowing guard for the failure arm — the else branch is [Ok](../interfaces/Ok.md)`<A>`.

## Type Parameters

### A

`A`

### E

`E`

## Parameters

### result

[`Result`](../type-aliases/Result.md)\<`A`, `E`\>

## Returns

`result is Err<E>`
