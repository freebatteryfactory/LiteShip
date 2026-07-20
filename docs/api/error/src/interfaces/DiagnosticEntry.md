[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / DiagnosticEntry

# Interface: DiagnosticEntry

Defined in: [error/src/codes.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L54)

What every enrolled [DiagnosticCode](../type-aliases/DiagnosticCode.md) carries — the human/agent-readable
meaning of the code, drawn from the emitter's own message / detail / remediation
text so the catalogue never drifts from what the code actually means.

## Properties

### area

> `readonly` **area**: [`DiagnosticArea`](../type-aliases/DiagnosticArea.md)

Defined in: [error/src/codes.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L62)

The subsystem that owns the code — the first segment of the [DiagnosticCode](../type-aliases/DiagnosticCode.md).

***

### explanation

> `readonly` **explanation**: `string`

Defined in: [error/src/codes.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L58)

The WHY — enough to understand the code without the source (from the emitter's detail / claim).

***

### remediation

> `readonly` **remediation**: `string`

Defined in: [error/src/codes.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L60)

The actionable fix — one precise instruction (from the emitter's remediation).

***

### title

> `readonly` **title**: `string`

Defined in: [error/src/codes.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L56)

Short human summary — the WHAT (drawn from the emitter's finding title / message).
