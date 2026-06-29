[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / NO\_EVIDENCE\_MARKER

# Variable: NO\_EVIDENCE\_MARKER

> `const` **NO\_EVIDENCE\_MARKER**: `"evidence:none"`

Defined in: [gauntlet/src/verdict-cache.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L153)

The inert marker folded into the key for a gate that declares NO out-of-IR evidence
(its [Gate.evidenceDigest](../interfaces/Gate.md#evidencedigest) is absent or returns `undefined`). By design NOT a
real evidence fold (a real fold carries the `ev:` scheme [stableEvidenceDigest](../functions/stableEvidenceDigest.md)
emits) so an "no evidence" key can never collide with a real "this exact evidence"
key — a gate that GAINS out-of-IR evidence keys apart from its old pure-IR self.
