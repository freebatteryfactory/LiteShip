[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / produceSkipSiteFactsFromContext

# Function: produceSkipSiteFactsFromContext()

> **produceSkipSiteFactsFromContext**(`context`, `detect?`): [`SkipSiteFacts`](../interfaces/SkipSiteFacts.md)

Defined in: [gauntlet/src/skip-site-facts.ts:137](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L137)

Convenience producer over a [GateContext](../interfaces/GateContext.md) — enumerates the [governedFiles](governedFiles.md),
reads through the context, and wraps the INJECTED `detectSkipsAST` when the host supplied it
(`context.skipDetector`), the token [detectSkips](detectSkips.md) otherwise. This is the host-side fold
a runner/CLI calls to land `context.skipSites`; it reads the context, but it is gauntlet-owned
infrastructure, not author gate code — the FactGate's `decide` never sees the context.

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### detect?

[`SkipDetector`](../type-aliases/SkipDetector.md) = `...`

## Returns

[`SkipSiteFacts`](../interfaces/SkipSiteFacts.md)
