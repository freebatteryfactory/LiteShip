[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ScenarioReplayFact

# Interface: ScenarioReplayFact

Defined in: [gauntlet/src/simulation-facts.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/simulation-facts.ts#L44)

One scenario's replay verdict — the host ran it TWICE from `seed` and compared
the byte-exact trace digests. `divergence` is present IFF the two replays
disagreed (the determinism failure). A run with no `divergence` is deterministic
(the replay property held).

## Properties

### divergence?

> `readonly` `optional` **divergence?**: [`ReplayDivergence`](ReplayDivergence.md)

Defined in: [gauntlet/src/simulation-facts.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/simulation-facts.ts#L60)

Present IFF the two replays diverged — the determinism violation. Carries the
human WHY and the first observable point at which the traces parted, so the
Finding names a concrete divergence, not just "not equal".

***

### firstDigest

> `readonly` **firstDigest**: `string`

Defined in: [gauntlet/src/simulation-facts.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/simulation-facts.ts#L53)

The two replay trace digests. EQUAL ⇒ deterministic; the host still records
them so the gate can SHOW the agreeing identity on a clean run if asked.

***

### scenarioId

> `readonly` **scenarioId**: `string`

Defined in: [gauntlet/src/simulation-facts.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/simulation-facts.ts#L46)

The scenario's stable id (the corpus / regression-seed key).

***

### secondDigest

> `readonly` **secondDigest**: `string`

Defined in: [gauntlet/src/simulation-facts.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/simulation-facts.ts#L54)

***

### seed

> `readonly` **seed**: `number`

Defined in: [gauntlet/src/simulation-facts.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/simulation-facts.ts#L48)

The seed both replays used — the reproducible identity of any divergence.
