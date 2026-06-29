[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / produceSkipSiteFacts

# Function: produceSkipSiteFacts()

> **produceSkipSiteFacts**(`files`, `readFile`, `detect?`): [`SkipSiteFacts`](../interfaces/SkipSiteFacts.md)

Defined in: [gauntlet/src/skip-site-facts.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L98)

THE PRODUCER — fold a governed file list into a [SkipSiteFacts](../interfaces/SkipSiteFacts.md) pack. Does all
acquisition (read + detect) and normalization (the registry lookup + the floor inputs),
reusing the canonical detector (`detect`, default the token [detectSkips](detectSkips.md)) and the
canonical sanction primitives. Pure w.r.t. its inputs; no clock, no ambient I/O beyond the
supplied `readFile`.

## Parameters

### files

readonly `string`[]

### readFile

(`file`) => `string` \| `undefined`

### detect?

[`SkipDetector`](../type-aliases/SkipDetector.md) = `detectSkips`

## Returns

[`SkipSiteFacts`](../interfaces/SkipSiteFacts.md)
