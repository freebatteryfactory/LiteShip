[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / NEVER\_SIGNABLE\_WEAKENINGS

# Variable: NEVER\_SIGNABLE\_WEAKENINGS

> `const` **NEVER\_SIGNABLE\_WEAKENINGS**: readonly [`WeakeningClass`](../type-aliases/WeakeningClass.md)[]

Defined in: [gauntlet/src/facts/standards-facts.ts:726](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L726)

The rule ids no STANDARDS WAIVER may ever sign off on — the always-blocking
floor. A sign-off authorizing the removal of an always-blocking rule, or a
weakening of a gate that emits one, is FORBIDDEN (void). This is the
"you cannot weaken-in a lie" floor, the meta-analogue of [ALWAYS\_BLOCKING\_RULES](ALWAYS_BLOCKING_RULES.md).

A weakening's `weakening` class of `always-blocking-removed` can NEVER be signed.
(The set is kept open so the host can compose the live `ALWAYS_BLOCKING_RULES` ids
onto it for the gate-level check.)
