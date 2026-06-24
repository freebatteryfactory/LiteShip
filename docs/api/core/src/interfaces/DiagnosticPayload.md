[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DiagnosticPayload

# Interface: DiagnosticPayload

Defined in: [core/src/diagnostics.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/diagnostics.ts#L21)

Operator-facing payload shape for a single diagnostic emission: a stable
`source`/`code` pair for filtering, a human message, plus optional structured
detail and an underlying cause.

## Extended by

- [`DiagnosticEvent`](DiagnosticEvent.md)

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: [core/src/diagnostics.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/diagnostics.ts#L25)

***

### code

> `readonly` **code**: `string`

Defined in: [core/src/diagnostics.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/diagnostics.ts#L23)

***

### detail?

> `readonly` `optional` **detail?**: `unknown`

Defined in: [core/src/diagnostics.ts:26](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/diagnostics.ts#L26)

***

### message

> `readonly` **message**: `string`

Defined in: [core/src/diagnostics.ts:24](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/diagnostics.ts#L24)

***

### source

> `readonly` **source**: `string`

Defined in: [core/src/diagnostics.ts:22](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/diagnostics.ts#L22)
