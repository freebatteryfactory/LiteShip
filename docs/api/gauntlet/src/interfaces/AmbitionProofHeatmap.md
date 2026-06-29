[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / AmbitionProofHeatmap

# Interface: AmbitionProofHeatmap

Defined in: [gauntlet/src/ambition-proof.ts:140](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L140)

The full deterministic heatmap artifact — ADVISORY triage, never a verdict.

## Properties

### advisory

> `readonly` **advisory**: `true`

Defined in: [gauntlet/src/ambition-proof.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L143)

Always advisory — encoded in the artifact so a reader can never mistake it for a gate verdict.

***

### format

> `readonly` **format**: `1`

Defined in: [gauntlet/src/ambition-proof.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L141)

***

### hotSpots

> `readonly` **hotSpots**: readonly [`ModuleHotSpot`](ModuleHotSpot.md)[]

Defined in: [gauntlet/src/ambition-proof.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L145)

Every ranked module, hottest (highest ambition÷proof) first.
