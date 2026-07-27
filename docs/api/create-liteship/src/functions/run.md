[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [create-liteship/src](../README.md) / run

# Function: run()

> **run**(`argv`, `io?`): `Promise`\<`number`\>

Defined in: [create-liteship/src/index.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/index.ts#L72)

CLI entry: `create-liteship [dir]`. Returns the process exit code
(0 scaffolded, 1 refused/failed) instead of calling process.exit so
the bin shim owns termination.

## Parameters

### argv

readonly `string`[]

### io?

[`RunIo`](../interfaces/RunIo.md) = `defaultIo`

## Returns

`Promise`\<`number`\>
