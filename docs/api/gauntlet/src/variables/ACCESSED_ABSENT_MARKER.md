[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ACCESSED\_ABSENT\_MARKER

# Variable: ACCESSED\_ABSENT\_MARKER

> `const` **ACCESSED\_ABSENT\_MARKER**: `"absent:accessed"`

Defined in: [gauntlet/src/verdict-cache.ts:285](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L285)

The inert marker [factAccessEvidenceDigest](../functions/factAccessEvidenceDigest.md) folds for a channel a gate
ACCESSED and found ABSENT (`undefined`). DISTINCT from [NO\_EVIDENCE\_MARKER](NO_EVIDENCE_MARKER.md)
(the gate declared/read NO evidence at all) and from a real `ev:` fold (a present
fact) — three mutually-exclusive states keyed apart. The `absent:` scheme prefix
means it can never collide with a real evidence fold (`ev:`) or the no-evidence
marker (`evidence:none`), so a gate whose verdict DEPENDS on a channel being absent
(the supply-chain `not-evidenced` branch) keys apart BOTH from a present-fact verdict
AND from a gate that never touched the channel — the absence is folded as evidence.
