[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / EquivalentVerdict

# Interface: EquivalentVerdict\<M\>

Defined in: [audit/src/mutation-verdict.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L143)

A justified-EQUIVALENT mutant — a RUNTIME mutation the engine cannot statically
exclude (it is not erased type syntax, so the type-position skip does not catch it)
but that is PROVABLY behaviour-identical to the original, so no test could ever
observe — and therefore never kill — it. It is matched by the injected
[EquivalentMutantRegistry](EquivalentMutantRegistry.md) against the mutant's CONTENT ADDRESS (so the
justification cannot silently drift to a different mutant: if the code changes, the
mutant's id changes, the registry entry no longer matches, and the mutant is
re-surfaced as a normal survivor — the anti-drift property). Excluded from the
survivor work-list AND the score denominator, yet RECORDED (the justification
travels with the verdict for review). NEVER a fake test — the avionics anti-laundering
discipline: the only honest way to mark a genuinely-equivalent mutant.

## Type Parameters

### M

`M` *extends* [`MutantCore`](MutantCore.md) = [`Mutant`](Mutant.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"equivalent"`

Defined in: [audit/src/mutation-verdict.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L144)

***

### justification

> `readonly` **justification**: `string`

Defined in: [audit/src/mutation-verdict.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L147)

The justification string from the registry (why this mutation changes nothing).

***

### mutant

> `readonly` **mutant**: `M`

Defined in: [audit/src/mutation-verdict.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L145)
