[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / HeatmapInputs

# Interface: HeatmapInputs

Defined in: [gauntlet/src/ambition-proof.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L87)

The inputs the host assembles for one heatmap run — flat, already-loaded data so
the fold is pure. The host owns the heavy reads (the IR build, the corpus scan, the
JSON parse); this module owns the deterministic blend.

## Properties

### claimHits

> `readonly` **claimHits**: `ReadonlyMap`\<`string`, `number`\>

Defined in: [gauntlet/src/ambition-proof.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L100)

Each module's claim-keyword HIT COUNT (the perf + semantic vocab the hard gates
scan), keyed by FileId. The host counts it via the same vocab the gates use; a
module absent here contributes 0 hits.

***

### effectiveLevels

> `readonly` **effectiveLevels**: `ReadonlyMap`\<`string`, [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)\>

Defined in: [gauntlet/src/ambition-proof.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L105)

Each module's EFFECTIVE assurance level (glob floor raised along import edges),
keyed by FileId. A module absent here is treated as the lowest level (`L0`).

***

### ir

> `readonly` **ir**: [`RepoIR`](RepoIR.md)

Defined in: [gauntlet/src/ambition-proof.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L89)

The injected repo-IR — the size/complexity/call-site/assurance substrate.

***

### moduleSizes

> `readonly` **moduleSizes**: `ReadonlyMap`\<`string`, `number`\>

Defined in: [gauntlet/src/ambition-proof.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L94)

Each substantive module's source byte-length, keyed by FileId. The host measures
it (the IR carries no byte count); a module absent here contributes size 0.

***

### proofSignals

> `readonly` **proofSignals**: `ReadonlyMap`\<`string`, [`ModuleProofSignals`](ModuleProofSignals.md)\>

Defined in: [gauntlet/src/ambition-proof.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L107)

Each module's host-measured proof signals, keyed by FileId.
