[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / verifyDeclaredFix

# Function: verifyDeclaredFix()

> **verifyDeclaredFix**(`fix`, `reality`): [`FixVerdict`](../type-aliases/FixVerdict.md)

Defined in: [gauntlet/src/declared-fix.ts:469](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L469)

VERIFY a declared fix against the host-measured reality — the agent-fix admission
control. Runs the four checks (scope ⊆ declared, size ≤ cap, no unsigned weakening
reusing phase A, receipt consistency) and returns a [FixVerdict](../type-aliases/FixVerdict.md): `admitted`
iff ALL pass, else `rejected` with EVERY reason (a fix that creeps scope AND weakens
reports both — the report is exhaustive, never first-failure-wins).

PURE + DETERMINISTIC: the same (fix, reality) always yields the same verdict. No
I/O, no clock read (the host injects `now`), no content-address mint (the host
supplies the measured addresses). This is the ONE engine phase B (apply-moment
admission) and phase C (the commit gate) both call.

## Parameters

### fix

[`DeclaredFix`](../interfaces/DeclaredFix.md)

### reality

[`MeasuredFixReality`](../interfaces/MeasuredFixReality.md)

## Returns

[`FixVerdict`](../type-aliases/FixVerdict.md)
