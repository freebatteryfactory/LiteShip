[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ChangeClass

# Type Alias: ChangeClass

> **ChangeClass** = `"strengthen"` \| `"weaken"` \| `"neutral"`

Defined in: [gauntlet/src/standards-facts.ts:323](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L323)

The classification of one change between the committed snapshot and the live
surface:
 - `strengthen`: added gate/fixture/invariant/always-blocking-rule, raised floor,
   raised level, removed waiver, shortened waiver expiry → OK (but the snapshot
   should be regenerated; an un-regenerated strengthen is NEUTRAL drift, not
   blocking).
 - `weaken`: removed gate, reduced fixtures, lowered floor, lowered/removed
   invariant, added/extended waiver, lowered level, shrunk always-blocking set,
   a proof replaced by a waiver → BLOCKING unless owner-signed.
 - `neutral`: a change that neither strengthens nor weakens (e.g. a snapshot that
   is simply un-regenerated after a strengthen, or an address-only restamp).
