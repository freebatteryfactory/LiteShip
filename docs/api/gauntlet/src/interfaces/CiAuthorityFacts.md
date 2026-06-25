[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CiAuthorityFacts

# Interface: CiAuthorityFacts

Defined in: [gauntlet/src/supply-chain-facts.ts:102](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L102)

CI-authority facts — the no-ambient-publish-authority verdict.

## Properties

### violations

> `readonly` **violations**: readonly [`SupplyChainViolation`](SupplyChainViolation.md)[]

Defined in: [gauntlet/src/supply-chain-facts.ts:111](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L111)

Every long-lived publish-secret reference found (an `NPM_TOKEN`,
`NODE_AUTH_TOKEN`, `npm_config__authToken`, …). EMPTY ⇒ the OIDC
trusted-publishing invariant holds: publish authority is the short-lived
id-token only.

***

### workflowsScanned

> `readonly` **workflowsScanned**: readonly `string`[]

Defined in: [gauntlet/src/supply-chain-facts.ts:104](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L104)

Workflow files scanned (repo-relative).
