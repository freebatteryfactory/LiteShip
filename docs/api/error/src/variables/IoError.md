[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / IoError

# Variable: IoError

> **IoError**: (`operation`, `detail`, `opts`) => [`IoError`](../interfaces/IoError.md)

Defined in: [error/src/variants.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L85)

Build an IoError. `opts.path` is the target; `opts.cause` chains the
underlying OS/library error through the standard `Error.cause` slot (read it
at `error.cause`, not as a own field).

## Parameters

### operation

`string`

### detail

`string`

### opts?

#### cause?

`unknown`

#### path?

`string`

## Returns

[`IoError`](../interfaces/IoError.md)
