[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DecodeIssueView

# Interface: DecodeIssueView

Defined in: [core/src/schema/standard.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L37)

The subset of a kernel decode issue this bridge reads: its machine `code` and
its path from the decode root. The kernel `DecodeIssue` carries more (a
`cause`, a message); a real `DecodeIssue` is structurally a `DecodeIssueView`,
so `Result<A, readonly DecodeIssue[]>` is accepted wherever this is expected.

## Properties

### code

> `readonly` **code**: `string`

Defined in: [core/src/schema/standard.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L39)

The machine-readable failure code, e.g. `'schema/type'`, `'schema/missing'`.

***

### path

> `readonly` **path**: readonly `PropertyKey`[]

Defined in: [core/src/schema/standard.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L41)

Path segments from the decode root to the offending value.
