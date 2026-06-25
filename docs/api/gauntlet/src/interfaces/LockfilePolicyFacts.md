[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / LockfilePolicyFacts

# Interface: LockfilePolicyFacts

Defined in: [gauntlet/src/supply-chain-facts.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L59)

Lockfile-policy facts — the four hermeticity laws over pnpm-lock.yaml.

## Properties

### lockfileVersion

> `readonly` **lockfileVersion**: `string`

Defined in: [gauntlet/src/supply-chain-facts.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L61)

The lockfile's declared `lockfileVersion` (e.g. `9.0`).

***

### packageCount

> `readonly` **packageCount**: `number`

Defined in: [gauntlet/src/supply-chain-facts.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L63)

Total resolved registry units the lockfile pins.

***

### violations

> `readonly` **violations**: readonly [`SupplyChainViolation`](SupplyChainViolation.md)[]

Defined in: [gauntlet/src/supply-chain-facts.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L65)

Every decided policy violation. EMPTY ⇒ the lockfile is policy-clean.
