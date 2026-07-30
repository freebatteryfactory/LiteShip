[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / McdcPinVerdict

# Type Alias: McdcPinVerdict

> **McdcPinVerdict** = `"killed"` \| `"survived"` \| `"no-coverage"` \| `"inconclusive"`

Defined in: [gauntlet/src/facts/mcdc-facts.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L73)

The kill/survive verdict tag a single condition-mutant pin earned — the same `_tag`
discriminant the mutation verdict uses (composition), restricted to the three the
MC/DC fold reads: a pin is never `equivalent` (a forced constant is, by construction,
a behaviour change at a reachable decision — there is no justified-equivalent pin).
 - `killed` — a covering test failed on the pinned code (the pin's effect is observed).
 - `survived` — every covering test passed on the pinned code (the effect is NOT
   observed at this pin — half the MC/DC pair is missing).
 - `no-coverage` — no test covers the condition at all (the worst signal — the
   decision is entirely untested).
