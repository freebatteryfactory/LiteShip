[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / TransitionRun

# Interface: TransitionRun

Defined in: [audit/src/transition-facts-build.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L78)

One case's raw run — both oracle sides over ONE seeded op history. The `history` is
any CBOR-encodable op-history value (the builder content-addresses it, so it needs no
knowledge of the `ReactiveOp` shape — the closed vocabulary stays in the Foundation
layer); `operations` is the flat list of op tags the history exercised (the coverage
fold, passed explicitly so the builder never parses the history).

## Properties

### history

> `readonly` **history**: `unknown`

Defined in: [audit/src/transition-facts-build.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L82)

The CBOR-encodable op history — content-addressed to the case's `traceDigest`.

***

### implementation

> `readonly` **implementation**: [`OracleOutcome`](../type-aliases/OracleOutcome.md)

Defined in: [audit/src/transition-facts-build.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L88)

The IMPLEMENTATION's outcome (the transport under test).

***

### model

> `readonly` **model**: [`OracleOutcome`](../type-aliases/OracleOutcome.md)

Defined in: [audit/src/transition-facts-build.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L86)

The MODEL's outcome (the single-oracle side).

***

### operations

> `readonly` **operations**: readonly `string`[]

Defined in: [audit/src/transition-facts-build.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L84)

The op tags exercised by this history (e.g. `['subscribe','set','read','dispose']`) — the coverage fold.

***

### seed

> `readonly` **seed**: `string`

Defined in: [audit/src/transition-facts-build.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L80)

The pinned seed that generated this op history — the replay key half.
