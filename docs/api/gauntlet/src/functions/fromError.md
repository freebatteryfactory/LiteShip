[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / fromError

# Function: fromError()

> **fromError**(`error`, `meta`): [`Finding`](../interfaces/Finding.md)

Defined in: [gauntlet/src/finding.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L125)

Project a tagged error (any `@czap/error` variant or downstream
variant) into a Finding — the bridge that keeps the error a gate CATCHES and
the finding it REPORTS in one vocabulary. The error's `_tag` seeds the title
and the `ruleId` namespace; its `message` becomes the detail.

## Parameters

### error

`TaggedError`

### meta

`object` & `object`

## Returns

[`Finding`](../interfaces/Finding.md)
