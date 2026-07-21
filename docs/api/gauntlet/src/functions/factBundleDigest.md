[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / factBundleDigest

# Function: factBundleDigest()

> **factBundleDigest**(`context`, `requires`): `string`

Defined in: [gauntlet/src/gate.ts:832](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L832)

The out-of-IR evidence digest for a [FactGate](../interfaces/FactGate.md) — the cache-soundness keystone,
derived from the DECLARED fact channels (not hand-authored). Folds each required
channel's content via [factAccessEvidenceDigest](factAccessEvidenceDigest.md) (absence-aware: an absent declared
fact folds a distinct marker, so a verdict that DEPENDS on absence still re-keys). Changing
a FactPack's content — or the sanction registry the producer folds into it — flips the key.

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### requires

readonly (`"skipSites"` \| `"activeSurfaceFacts"` \| `"checkGovernance"`)[]

## Returns

`string`
