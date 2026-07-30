[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [liteship/src](../README.md) / explainDiagnostic

# Function: explainDiagnostic()

> **explainDiagnostic**(`code`): [`DiagnosticEntry`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts) \| `undefined`

Defined in: error/dist/codes.d.ts:399

Look up a diagnostic code's [DiagnosticEntry](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts), or `undefined` when the code
is not enrolled. Accepts any string (the gauntlet's static scan passes raw
emitted-code literals through here) — an unregistered code returns `undefined`,
which is exactly the signal the `gauntlet/diagnostic-code-registered` gate reds on.

## Parameters

### code

`string`

## Returns

[`DiagnosticEntry`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts) \| `undefined`
