[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SkipSiteFact

# Interface: SkipSiteFact

Defined in: [gauntlet/src/skip-site-facts.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L50)

One detected skip site, with the three orthogonal floor inputs PRE-COMPUTED by the producer
so the [kernel](../functions/decideSkipSite.md) composes them with no string / Map work of its own:
 - `carriesPlaceholder` — the site's source line carries a placeholder marker (TODO / stub /
   …); a placeholder can never be sanctioned (the always-blocking no-placeholder floor).
 - `sanctionMatched` — the `(file, normalized-site)` pair is enumerated in the sanctioned-skip
   allowlist (the pre-floor registry match).
 - `capabilityConsistent` — the matched entry is self-consistent with its declared capability
   (the AST-conditionality proof when available, else the keyword heuristic); `false` when no
   entry matched.

## Properties

### capabilityConsistent

> `readonly` **capabilityConsistent**: `boolean`

Defined in: [gauntlet/src/skip-site-facts.ts:57](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L57)

***

### carriesPlaceholder

> `readonly` **carriesPlaceholder**: `boolean`

Defined in: [gauntlet/src/skip-site-facts.ts:55](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L55)

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/skip-site-facts.ts:51](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L51)

***

### form

> `readonly` **form**: [`SkipForm`](../type-aliases/SkipForm.md)

Defined in: [gauntlet/src/skip-site-facts.ts:53](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L53)

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/skip-site-facts.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L52)

***

### sanctionMatched

> `readonly` **sanctionMatched**: `boolean`

Defined in: [gauntlet/src/skip-site-facts.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L56)

***

### token

> `readonly` **token**: `string`

Defined in: [gauntlet/src/skip-site-facts.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L54)
