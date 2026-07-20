[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / WaiverFreshnessFact

# Interface: WaiverFreshnessFact

Defined in: [gauntlet/src/facts/check-governance-facts.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L55)

One waiver's freshness verdict for `check-waiver-freshness`, decided vs the injected wall-clock date.

## Properties

### expired

> `readonly` **expired**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L63)

Whether the waiver's expiry is strictly before the injected wall-clock date (the debt came due).

***

### expires

> `readonly` **expires**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L61)

The waiver's ISO `yyyy-mm-dd` expiry.

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L59)

A human identity for the waiver (ruleId@file:line for gauntlet; the invariant id / expiry for the ledger).

***

### store

> `readonly` **store**: `"gauntlet"` \| `"ledger"`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L57)

Which store the waiver lives in — the gauntlet `waivers.ts` registry or the traceability ledger.
