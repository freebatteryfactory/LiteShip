[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / applyStandardsWaivers

# Function: applyStandardsWaivers()

> **applyStandardsWaivers**(`changes`, `signoffs`, `now`, `alwaysBlockingRuleIds`, `siteConditionality?`): `Omit`\<[`StandardsIntegrityFacts`](../interfaces/StandardsIntegrityFacts.md), `"committedAddress"` \| `"liveAddress"`\>

Defined in: [gauntlet/src/facts/standards-facts.ts:771](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L771)

Partition the classified changes against the committed owner sign-offs as of
`now` (the INJECTED wall-clock date — the two-clock law, never `Date.now()`), and
the live always-blocking rule ids (so a weakening of a gate emitting one is
forbidden from being signed). Pure + deterministic.

A WEAKEN is:
 - FORBIDDEN if its class is in [NEVER\_SIGNABLE\_WEAKENINGS](../variables/NEVER_SIGNABLE_WEAKENINGS.md) OR its element's
   ruleId is an always-blocking rule → it stays unsigned (blocking) AND a forbidden
   sign-off finding is emitted if a sign-off tried to cover it.
 - SIGNED if a non-expired sign-off matches its `elementKey` AND its `weakening`
   class → allowed + recorded.
 - EXPIRED if the only matching sign-off is past `now` → unsigned (blocking) +
   an expired-sign-off finding.
 - else UNSIGNED → blocking.

A STRENGTHEN/NEUTRAL is un-regenerated drift (a stale-but-safe snapshot).

## Parameters

### changes

readonly [`StandardsChange`](../interfaces/StandardsChange.md)[]

### signoffs

readonly [`StandardsWaiver`](../interfaces/StandardsWaiver.md)[]

### now

`Date`

### alwaysBlockingRuleIds

`ReadonlySet`\<`string`\>

### siteConditionality?

[`SiteConditionalityResolver`](../type-aliases/SiteConditionalityResolver.md)

## Returns

`Omit`\<[`StandardsIntegrityFacts`](../interfaces/StandardsIntegrityFacts.md), `"committedAddress"` \| `"liveAddress"`\>
