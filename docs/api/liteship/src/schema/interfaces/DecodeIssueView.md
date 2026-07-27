[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / DecodeIssueView

# Interface: DecodeIssueView

Defined in: core/dist/schema/standard.d.ts:34

The subset of a kernel decode issue this bridge reads: its machine `code` and
its path from the decode root. The kernel `DecodeIssue` carries more (a
`cause`, a message); a real `DecodeIssue` is structurally a `DecodeIssueView`,
so `Result<A, readonly DecodeIssue[]>` is accepted wherever this is expected.

## Properties

### code

> `readonly` **code**: `string`

Defined in: core/dist/schema/standard.d.ts:36

The machine-readable failure code, e.g. `'schema/type'`, `'schema/missing'`.

***

### path

> `readonly` **path**: readonly `PropertyKey`[]

Defined in: core/dist/schema/standard.d.ts:38

Path segments from the decode root to the offending value.
