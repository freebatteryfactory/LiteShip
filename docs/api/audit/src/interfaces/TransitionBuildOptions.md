[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / TransitionBuildOptions

# Interface: TransitionBuildOptions

Defined in: [audit/src/transition-facts-build.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L92)

Options for [buildTransitionFacts](../functions/buildTransitionFacts.md) — the family + the two transport fingerprints + the ratchet.

## Properties

### family

> `readonly` **family**: `string`

Defined in: [audit/src/transition-facts-build.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L94)

The conformance family this run covers (e.g. `'cell'`) — aims the gate's level, woven into findings.

***

### implementationDigest

> `readonly` **implementationDigest**: `string`

Defined in: [audit/src/transition-facts-build.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L98)

The content address of the IMPLEMENTATION transport under test.

***

### modelDigest

> `readonly` **modelDigest**: `string`

Defined in: [audit/src/transition-facts-build.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L96)

The content address of the MODEL transport (the single-oracle fingerprint).

***

### unevidencedBaseline?

> `readonly` `optional` **unevidencedBaseline?**: `number`

Defined in: [audit/src/transition-facts-build.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L104)

The committed maximum tolerated `unevidenced` case count for this family (the
ratchet floor). Omitted → no committed floor (the family's first measurement,
reported informationally, never a regression).
