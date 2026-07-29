[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / ScenarioReplayFact

# Interface: ScenarioReplayFact

Defined in: [gauntlet/src/facts/simulation-facts.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L44)

One scenario's replay verdict — the host ran it TWICE from `seed` and compared
the byte-exact trace digests. `divergence` is present IFF the two replays
disagreed (the determinism failure). A run with no `divergence` is deterministic
(the replay property held).

## Properties

### divergence?

> `readonly` `optional` **divergence?**: [`ReplayDivergence`](ReplayDivergence.md)

Defined in: [gauntlet/src/facts/simulation-facts.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L70)

Present IFF the two replays diverged — the determinism violation. Carries the
human WHY and the first observable point at which the traces parted, so the
Finding names a concrete divergence, not just "not equal".

***

### faultSchedule

> `readonly` **faultSchedule**: readonly [`SimulationFaultFact`](SimulationFaultFact.md)[]

Defined in: [gauntlet/src/facts/simulation-facts.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L54)

The deterministic fault schedule applied to both replays.

***

### firstDigest

> `readonly` **firstDigest**: `string`

Defined in: [gauntlet/src/facts/simulation-facts.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L63)

The two replay trace digests. EQUAL ⇒ deterministic; the host still records
them so the gate can SHOW the agreeing identity on a clean run if asked.

***

### invariant

> `readonly` **invariant**: `string`

Defined in: [gauntlet/src/facts/simulation-facts.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L50)

The steady-state law the scenario is intended to preserve.

***

### owner

> `readonly` **owner**: `string`

Defined in: [gauntlet/src/facts/simulation-facts.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L48)

Package or subsystem that owns the exercised behavior.

***

### recoveryExpectation

> `readonly` **recoveryExpectation**: [`SimulationRecoveryExpectation`](SimulationRecoveryExpectation.md) \| `null`

Defined in: [gauntlet/src/facts/simulation-facts.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L56)

Expected degradation/recovery claims, or null for a no-fault baseline.

***

### recoveryObservation

> `readonly` **recoveryObservation**: [`SimulationRecoveryObservation`](SimulationRecoveryObservation.md) \| `null`

Defined in: [gauntlet/src/facts/simulation-facts.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L58)

Host-observed campaign results, or null for a no-fault baseline.

***

### scenarioId

> `readonly` **scenarioId**: `string`

Defined in: [gauntlet/src/facts/simulation-facts.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L46)

The scenario's stable id (the corpus / regression-seed key).

***

### secondDigest

> `readonly` **secondDigest**: `string`

Defined in: [gauntlet/src/facts/simulation-facts.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L64)

***

### seed

> `readonly` **seed**: `number`

Defined in: [gauntlet/src/facts/simulation-facts.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L52)

The seed both replays used — the reproducible identity of any divergence.
