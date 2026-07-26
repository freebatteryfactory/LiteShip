[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / DiagnosticEvent

# Interface: DiagnosticEvent

Defined in: core/dist/evidence/diagnostics.d.ts:32

A [DiagnosticPayload](DiagnosticPayload.md) enriched with severity and an emission timestamp.

## Extends

- [`DiagnosticPayload`](DiagnosticPayload.md)

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: core/dist/evidence/diagnostics.d.ts:24

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`cause`](DiagnosticPayload.md#cause)

***

### code

> `readonly` **code**: `string`

Defined in: core/dist/evidence/diagnostics.d.ts:22

Local operator code. Stable public identities use the registered-only methods below.

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`code`](DiagnosticPayload.md#code)

***

### detail?

> `readonly` `optional` **detail?**: `unknown`

Defined in: core/dist/evidence/diagnostics.d.ts:25

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`detail`](DiagnosticPayload.md#detail)

***

### level

> `readonly` **level**: [`DiagnosticLevel`](../type-aliases/DiagnosticLevel.md)

Defined in: core/dist/evidence/diagnostics.d.ts:33

***

### message

> `readonly` **message**: `string`

Defined in: core/dist/evidence/diagnostics.d.ts:23

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`message`](DiagnosticPayload.md#message)

***

### source

> `readonly` **source**: `string`

Defined in: core/dist/evidence/diagnostics.d.ts:20

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`source`](DiagnosticPayload.md#source)

***

### timestamp

> `readonly` **timestamp**: `number`

Defined in: core/dist/evidence/diagnostics.d.ts:34
