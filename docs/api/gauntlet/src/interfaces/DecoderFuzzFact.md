[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / DecoderFuzzFact

# Interface: DecoderFuzzFact

Defined in: [gauntlet/src/fuzz-facts.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/fuzz-facts.ts#L54)

One decoder's fuzz verdict — the host ran the committed corpus seeds AND a
fixed, seeded count of generated inputs against it, and classified every
outcome. `failClosed` is true IFF EVERY input ended fail-closed-or-typed with
no prototype pollution. `violation` is present IFF the invariant broke (a crash
/ a pollution / a misparse) — the cardinal failure.

## Properties

### decoderId

> `readonly` **decoderId**: `string`

Defined in: [gauntlet/src/fuzz-facts.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/fuzz-facts.ts#L56)

The decoder's stable id (the SUT / corpus key).

***

### failClosed

> `readonly` **failClosed**: `boolean`

Defined in: [gauntlet/src/fuzz-facts.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/fuzz-facts.ts#L58)

Every input was fail-closed-or-typed (no crash, no pollution, no misparse).

***

### inputsExercised

> `readonly` **inputsExercised**: `number`

Defined in: [gauntlet/src/fuzz-facts.ts:60](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/fuzz-facts.ts#L60)

How many inputs were exercised (corpus seeds + generated).

***

### violation?

> `readonly` `optional` **violation?**: [`DecodeViolation`](DecodeViolation.md)

Defined in: [gauntlet/src/fuzz-facts.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/fuzz-facts.ts#L66)

Present IFF the invariant broke — the decode-surface violation. Carries the
class + the reproducer so the Finding names a concrete, replayable failure,
not just "not fail-closed".
