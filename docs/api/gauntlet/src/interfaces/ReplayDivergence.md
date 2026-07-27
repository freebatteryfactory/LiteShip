[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ReplayDivergence

# Interface: ReplayDivergence

Defined in: [gauntlet/src/facts/simulation-facts.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L103)

The recorded detail of a replay divergence — enough to act on without re-running
the harness. `firstDivergentLabel` names the earliest observation point where the
two traces parted (or `null` when they diverged in length/shape rather than at a
labeled point); `detail` is the human explanation the host decided.

## Properties

### detail

> `readonly` **detail**: `string`

Defined in: [gauntlet/src/facts/simulation-facts.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L107)

Human WHY — e.g. "step `worker.message` observed a wall-clock-derived value".

***

### firstDivergentLabel

> `readonly` **firstDivergentLabel**: `string` \| `null`

Defined in: [gauntlet/src/facts/simulation-facts.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L105)

The earliest trace label at which the two replays parted, or null.
