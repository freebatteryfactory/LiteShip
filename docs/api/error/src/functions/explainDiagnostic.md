[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / explainDiagnostic

# Function: explainDiagnostic()

> **explainDiagnostic**(`code`): [`DiagnosticEntry`](../interfaces/DiagnosticEntry.md) \| `undefined`

Defined in: [error/src/codes.ts:1291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L1291)

Look up a diagnostic code's [DiagnosticEntry](../interfaces/DiagnosticEntry.md), or `undefined` when the code
is not enrolled. Accepts any string (the gauntlet's static scan passes raw
emitted-code literals through here) — an unregistered code returns `undefined`,
which is exactly the signal the `gauntlet/diagnostic-code-registered` gate reds on.

## Parameters

### code

`string`

## Returns

[`DiagnosticEntry`](../interfaces/DiagnosticEntry.md) \| `undefined`
