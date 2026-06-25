[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / applyWaivers

# Function: applyWaivers()

> **applyWaivers**(`findings`, `waivers`, `now`): [`WaiverApplication`](../interfaces/WaiverApplication.md)

Defined in: [gauntlet/src/waiver.ts:122](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L122)

Partition `findings` against `waivers` as of `now`. Pure + deterministic:

- A finding is WAIVED iff some VALID (non-expired, non-forbidden) waiver
  matches it → it goes to `waived`, not `kept`.
- An EXPIRED waiver → an `error` finding (`gauntlet/waiver-expired`) naming the
  rule + expiry + owner. The finding it would have covered is NOT suppressed.
- A STALE waiver (not expired, not forbidden, matches NO finding) → a `warning`
  (`gauntlet/waiver-stale`).
- A FORBIDDEN waiver (targets [ALWAYS\_BLOCKING\_RULES](../variables/ALWAYS_BLOCKING_RULES.md)) → an `error`
  (`gauntlet/waiver-forbidden`); it is VOID, so any finding it "matches" stays
  in `kept`.

`now` is injected — there is NO `Date.now()` here.

## Parameters

### findings

readonly [`Finding`](../interfaces/Finding.md)[]

### waivers

readonly [`Waiver`](../interfaces/Waiver.md)[]

### now

`Date`

## Returns

[`WaiverApplication`](../interfaces/WaiverApplication.md)
