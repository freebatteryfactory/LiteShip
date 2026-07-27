[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / DiagnosticPayload

# Interface: DiagnosticPayload

Defined in: core/dist/evidence/diagnostics.d.ts:19

Operator-facing payload shape for a single diagnostic emission: a stable
`source`/`code` pair for filtering, a human message, plus optional structured
detail and an underlying cause.

## Extended by

- [`DiagnosticEvent`](DiagnosticEvent.md)

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: core/dist/evidence/diagnostics.d.ts:24

***

### code

> `readonly` **code**: `string`

Defined in: core/dist/evidence/diagnostics.d.ts:22

Local operator code. Stable public identities use the registered-only methods below.

***

### detail?

> `readonly` `optional` **detail?**: `unknown`

Defined in: core/dist/evidence/diagnostics.d.ts:25

***

### message

> `readonly` **message**: `string`

Defined in: core/dist/evidence/diagnostics.d.ts:23

***

### source

> `readonly` **source**: `string`

Defined in: core/dist/evidence/diagnostics.d.ts:20
