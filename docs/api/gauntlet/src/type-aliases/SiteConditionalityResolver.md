[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SiteConditionalityResolver

# Type Alias: SiteConditionalityResolver

> **SiteConditionalityResolver** = (`file`, `site`) => `SiteConditionality` \| `undefined`

Defined in: [gauntlet/src/standards-facts.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L55)

Resolve the STRUCTURAL conditionality of a sanctioned skip site (the AST proof), injected by the
host (which parses the live source via `@liteship/audit`'s `detectSkipsAST`). `undefined` ⇒ the site
was not found / no AST available → the title-keyword heuristic is the documented lean fallback.
The lean engine carries no `typescript`, so the SOUND proof is host-computed and injected here —
the same boundary as the no-skip gate's `skipDetector`.

## Parameters

### file

`string`

### site

`string`

## Returns

`SiteConditionality` \| `undefined`
