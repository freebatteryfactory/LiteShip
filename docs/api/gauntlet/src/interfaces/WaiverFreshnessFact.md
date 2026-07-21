[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / WaiverFreshnessFact

# Interface: WaiverFreshnessFact

Defined in: [gauntlet/src/facts/check-governance-facts.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L68)

One waiver's freshness verdict for `check-waiver-freshness`, decided vs the injected wall-clock date.

## Properties

### expired

> `readonly` **expired**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L76)

Whether the waiver's expiry is strictly before the injected wall-clock date (the debt came due).

***

### expires

> `readonly` **expires**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L74)

The waiver's ISO `yyyy-mm-dd` expiry.

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L72)

A human identity for the waiver (ruleId@file:line for gauntlet; the invariant id / expiry for the ledger).

***

### store

> `readonly` **store**: `"gauntlet"` \| `"ledger"`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L70)

Which store the waiver lives in — the gauntlet `waivers.ts` registry or the traceability ledger.
