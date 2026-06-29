[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SkipConditionality

# Type Alias: SkipConditionality

> **SkipConditionality** = `"skipIf"` \| `"runIf"` \| `"ternary"` \| `"enclosing-if"` \| `"unconditional"`

Defined in: [gauntlet/src/gates/skip-detect.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-detect.ts#L139)

The CONDITIONALITY classification of a detected skip — whether the skip's reachability is
GUARDED by a runtime condition (a capability gate) or is UNCONDITIONAL (a placeholder).

This is the F2-soundness discriminant. The TOKEN [detectSkips](../functions/detectSkips.md) cannot decide it (it
cannot see an enclosing `if (<cond>) { … }` ancestor), so it leaves it `undefined`; the
AST detector (`detectSkipsAST`, in `@czap/audit`) sets it from a real ancestor walk:
 - `'skipIf'` / `'runIf'` — the call member IS the runtime gate (`it.skipIf(cond)(…)`);
 - `'ternary'` — the skip accessor is a TERNARY ARM (`cond ? it : it.skip`);
 - `'enclosing-if'` — the skip CALL sits inside an `if (<cond>) { … }` whose body holds it
   (the ancestor walk the token level cannot do — the soundness win);
 - `'unconditional'` — none of the above; the skip is ALWAYS reached (a placeholder).

Optional on [SkipMatch](../interfaces/SkipMatch.md): the lean token detector omits it (the keyword-heuristic
fallback path decides sanctioning), the AST detector always sets it (the structural path).
