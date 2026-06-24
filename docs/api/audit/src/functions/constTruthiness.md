[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / constTruthiness

# Function: constTruthiness()

> **constTruthiness**(`expr`): `boolean` \| `undefined`

Defined in: [audit/src/skip-detect-ast.ts:846](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/skip-detect-ast.ts#L846)

The COMPILE-TIME truthiness of a condition expression WHEN it is a constant — `true`/`false`, a
numeric / string / bigint literal, `null`, the `undefined`/`NaN`/`Infinity` identifiers, a regex
(always truthy), a `!`/unary-`±`/`void` over a constant, and a short-circuiting `&&`/`||` of
constants. Returns `true`/`false` for a DECIDED constant, or `undefined` when the expression
references a RUNTIME value (an ordinary identifier, a call, a comparison, …). PARSER-DECIDABLE — no
evaluation, no checker, no Program.

THE SOUNDNESS FLOOR (codex round-7). A guard is a genuine runtime gate ONLY when its condition can
vary at runtime; a COMPILE-TIME-CONSTANT condition (`if (true) {…}`, `skipIf(true)`, `true ? … : …`)
is VACUOUS — the branch is taken (or not) unconditionally, so the skip is a placeholder dressed as a
gate. A real capability gate (`!FFMPEG`, `process.platform === 'win32'`, `!canUseSAB`) references a
runtime value → `undefined` here → NEVER folded. The function ONLY ever returns a decided boolean
for a literal-constant expression, so it can never mis-judge a real gate as vacuous (no false
"unconditional"); the residual is the reverse (a contrived all-literal comparison like `1 === 1` is
left as `undefined` → treated as a gate), which is harmless and far rarer than `if (true)`.

EXPORTED for the capability-link oracle (codex round-9 sweep): a vacuously-true guard
(`true || capabilityProbe`) is unconditional, so it is NOT gated by the capability — the oracle skips
any guard whose `constTruthiness` is decided, mirroring this conditionality floor.

## Parameters

### expr

`Expression`

## Returns

`boolean` \| `undefined`
