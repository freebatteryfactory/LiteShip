[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / guardExpressionsOf

# Function: guardExpressionsOf()

> **guardExpressionsOf**(`node`): readonly `Expression`[]

Defined in: [audit/src/skip-detect-ast.ts:1002](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/skip-detect-ast.ts#L1002)

Collect EVERY guard CONDITION expression governing the skip at `node` (the skip access or its call):
 - the `.skipIf(<cond>)` / `.runIf(<cond>)` member-call argument;
 - a `.skip(<cond>, …)` skip-with-condition argument;
 - every enclosing `?:` condition on the value spine (`cond ? it : it.skip`);
 - every enclosing `if (<cond>) { … }` condition up to the function boundary.

This is the syntactic counterpart of `classifyConditional` that returns the guard NODES rather
than a classification — the CAPABILITY-GATE LINKER (`@czap/audit`'s capability-link oracle) resolves
the symbols of these expressions through the checker to PROVE the skip's guard derives from its
declared capability's probe (codex round-8 #1b: conditional ≠ gated-by-the-declared-capability).
Returns `[]` for an unconditional skip (no guard) — exported for the host oracle (parser-only; the
symbol resolution happens in the oracle's `ts.Program`).

## Parameters

### node

`Node`

## Returns

readonly `Expression`[]
