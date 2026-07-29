[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / BENCH\_NOT\_APPLICABLE\_MARKER

# Variable: BENCH\_NOT\_APPLICABLE\_MARKER

> `const` **BENCH\_NOT\_APPLICABLE\_MARKER**: `"// BENCH-NOT-APPLICABLE:"`

Defined in: core/dist/evidence/bench-marker.d.ts:8

The exact first-line marker a TYPED not-applicable generated bench carries.
Format: this literal prefix, a space, then the single-line reason. A gate
matches the prefix via [BENCH\_NOT\_APPLICABLE\_RE](BENCH_NOT_APPLICABLE_RE.md) and reads the reason
as the rest of the line; the SAME reason is recorded in the manifest's
`benchExemption.reason` for the capsule, so the two are cross-checkable.
