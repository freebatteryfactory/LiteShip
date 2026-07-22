[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DiagnosticPayload

# Interface: DiagnosticPayload

Defined in: [core/src/evidence/diagnostics.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L22)

Operator-facing payload shape for a single diagnostic emission: a stable
`source`/`code` pair for filtering, a human message, plus optional structured
detail and an underlying cause.

## Extended by

- [`DiagnosticEvent`](DiagnosticEvent.md)

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: [core/src/evidence/diagnostics.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L27)

***

### code

> `readonly` **code**: `string`

Defined in: [core/src/evidence/diagnostics.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L25)

Local operator code. Stable public identities use the registered-only methods below.

***

### detail?

> `readonly` `optional` **detail?**: `unknown`

Defined in: [core/src/evidence/diagnostics.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L28)

***

### message

> `readonly` **message**: `string`

Defined in: [core/src/evidence/diagnostics.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L26)

***

### source

> `readonly` **source**: `string`

Defined in: [core/src/evidence/diagnostics.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L23)
