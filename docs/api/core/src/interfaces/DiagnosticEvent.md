[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DiagnosticEvent

# Interface: DiagnosticEvent

Defined in: [core/src/evidence/diagnostics.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L37)

A [DiagnosticPayload](DiagnosticPayload.md) enriched with severity and an emission timestamp.

## Extends

- [`DiagnosticPayload`](DiagnosticPayload.md)

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: [core/src/evidence/diagnostics.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L27)

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`cause`](DiagnosticPayload.md#cause)

***

### code

> `readonly` **code**: `string`

Defined in: [core/src/evidence/diagnostics.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L25)

Local operator code. Stable public identities use the registered-only methods below.

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`code`](DiagnosticPayload.md#code)

***

### detail?

> `readonly` `optional` **detail?**: `unknown`

Defined in: [core/src/evidence/diagnostics.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L28)

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`detail`](DiagnosticPayload.md#detail)

***

### level

> `readonly` **level**: [`DiagnosticLevel`](../type-aliases/DiagnosticLevel.md)

Defined in: [core/src/evidence/diagnostics.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L38)

***

### message

> `readonly` **message**: `string`

Defined in: [core/src/evidence/diagnostics.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L26)

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`message`](DiagnosticPayload.md#message)

***

### source

> `readonly` **source**: `string`

Defined in: [core/src/evidence/diagnostics.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L23)

#### Inherited from

[`DiagnosticPayload`](DiagnosticPayload.md).[`source`](DiagnosticPayload.md#source)

***

### timestamp

> `readonly` **timestamp**: `number`

Defined in: [core/src/evidence/diagnostics.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/diagnostics.ts#L39)
