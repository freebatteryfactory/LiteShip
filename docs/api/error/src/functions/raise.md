[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / raise

# Function: raise()

> **raise**(`error`): `never`

Defined in: [error/src/contract.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L141)

Throw a tagged error as a value, typed `never` so it composes inside
expressions (`return cond ? value : raise(SomeError(…))`). Errors built by
[taggedError](taggedError.md) are real `Error`s, so the throw carries a stack trace.

## Parameters

### error

[`TaggedError`](../interfaces/TaggedError.md)

## Returns

`never`
