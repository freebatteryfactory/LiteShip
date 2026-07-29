[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / BENCH\_NOT\_APPLICABLE\_RE

# Variable: BENCH\_NOT\_APPLICABLE\_RE

> `const` **BENCH\_NOT\_APPLICABLE\_RE**: `RegExp`

Defined in: core/dist/evidence/bench-marker.d.ts:14

Anchored matcher for the marker line. Group 1 is the trimmed reason. Anchored
to the start of a line (multiline) so it only matches the dedicated marker
line, never an incidental mention of the token inside a longer comment.
