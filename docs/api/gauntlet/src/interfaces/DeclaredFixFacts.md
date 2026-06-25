[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / DeclaredFixFacts

# Interface: DeclaredFixFacts

Defined in: [gauntlet/src/declared-fix.ts:503](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L503)

The flat DECIDED facts the [declaredFixProtocolGate](../variables/declaredFixProtocolGate.md) folds — the HOST has
ALREADY run [verifyDeclaredFix](../functions/verifyDeclaredFix.md) (phase B's apply-moment verdict, or a fresh
commit-moment verification) and hands the engine the verdict + the declared intent
(carried for the report). When NO agent-fix is being validated (a normal commit),
the host injects NOTHING and the gate is silent (phase A already guards that path).

The same lean-engine shape as [StandardsIntegrityFacts](StandardsIntegrityFacts.md): the host computes,
the gate folds.

## Properties

### intent

> `readonly` **intent**: `string`

Defined in: [gauntlet/src/declared-fix.ts:505](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L505)

The declared intent (for the report — so a rejection names what was claimed).

***

### verdict

> `readonly` **verdict**: [`FixVerdict`](../type-aliases/FixVerdict.md)

Defined in: [gauntlet/src/declared-fix.ts:507](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L507)

The verifier's verdict — the gate folds a `rejected` into blocking Findings.
