[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / WaiverApplication

# Interface: WaiverApplication

Defined in: [gauntlet/src/waiver.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L76)

The partition [applyWaivers](../functions/applyWaivers.md) returns.

## Properties

### kept

> `readonly` **kept**: [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/waiver.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L78)

Findings NOT suppressed — they remain subject to the authority ratchet.

***

### waived

> `readonly` **waived**: [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/waiver.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L80)

Findings a valid, matching, non-expired waiver suppressed.

***

### waiverFindings

> `readonly` **waiverFindings**: [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/waiver.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L82)

Findings ABOUT the waivers themselves (expired / stale / forbidden).
