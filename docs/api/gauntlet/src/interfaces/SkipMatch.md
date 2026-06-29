[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SkipMatch

# Interface: SkipMatch

Defined in: [gauntlet/src/gates/skip-detect.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-detect.ts#L142)

One detected skip — its 1-based line, the form it took, and the matched token.

## Properties

### conditional?

> `readonly` `optional` **conditional?**: [`SkipConditionality`](../type-aliases/SkipConditionality.md)

Defined in: [gauntlet/src/gates/skip-detect.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-detect.ts#L153)

The CONDITIONALITY classification — present ONLY when a structural (AST) detector produced
this match (`detectSkipsAST`); the token [detectSkips](../functions/detectSkips.md) omits it (`undefined`).
When present it is the SOUND F2 discriminant: an `'unconditional'` skip is a non-sanctionable
placeholder regardless of its title; any other value is a signable capability gate.

***

### form

> `readonly` **form**: [`SkipForm`](../type-aliases/SkipForm.md)

Defined in: [gauntlet/src/gates/skip-detect.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-detect.ts#L144)

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/gates/skip-detect.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-detect.ts#L143)

***

### token

> `readonly` **token**: `string`

Defined in: [gauntlet/src/gates/skip-detect.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-detect.ts#L146)

The matched skip token (e.g. `it.skip`, `describe.skipIf`, `xit`, `it["skip"]`) — for the detail.
