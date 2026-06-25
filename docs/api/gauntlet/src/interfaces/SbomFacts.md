[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SbomFacts

# Interface: SbomFacts

Defined in: [gauntlet/src/supply-chain-facts.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L69)

SBOM facts — completeness + lockfile-match of the emitted bill of materials.

## Properties

### artifactPath

> `readonly` **artifactPath**: `string`

Defined in: [gauntlet/src/supply-chain-facts.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L71)

Repo-relative path of the committed SBOM artifact the host emitted/read.

***

### componentCount

> `readonly` **componentCount**: `number`

Defined in: [gauntlet/src/supply-chain-facts.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L75)

Components (packages) the SBOM enumerates.

***

### contentAddress

> `readonly` **contentAddress**: `string`

Defined in: [gauntlet/src/supply-chain-facts.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L73)

Content address (AddressedDigest display id) of the SBOM the host built.

***

### violations

> `readonly` **violations**: readonly [`SupplyChainViolation`](SupplyChainViolation.md)[]

Defined in: [gauntlet/src/supply-chain-facts.ts:81](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L81)

Packages present in the lockfile but ABSENT from the SBOM (completeness
gap), or present in the SBOM but absent from the lockfile (phantom). EMPTY
⇒ the SBOM exactly covers the lockfile.
