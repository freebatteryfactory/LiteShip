[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ProvenanceFacts

# Interface: ProvenanceFacts

Defined in: [gauntlet/src/supply-chain-facts.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L85)

Provenance facts — the ShipCapsule evidence re-read + validated.

## Properties

### packageName

> `readonly` **packageName**: `string`

Defined in: [gauntlet/src/supply-chain-facts.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L87)

The package this capsule attests (`@scope/name`).

***

### sourceCommit

> `readonly` **sourceCommit**: `string`

Defined in: [gauntlet/src/supply-chain-facts.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L89)

The recorded `source_commit` (well-formedness is a violation if not).

***

### sourceDirty

> `readonly` **sourceDirty**: `boolean`

Defined in: [gauntlet/src/supply-chain-facts.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L91)

Whether the capsule recorded a dirty working tree at ship time.

***

### violations

> `readonly` **violations**: readonly [`SupplyChainViolation`](SupplyChainViolation.md)[]

Defined in: [gauntlet/src/supply-chain-facts.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L98)

Every decided provenance violation — chiefly `lockfile-address-drift` (the
capsule's recorded `lockfile_address` ≠ the live pnpm-lock.yaml's address),
plus malformed `source_commit` / absent `build_env`. EMPTY ⇒ the capsule's
evidence provably matches the tree it claims to be built from.
