[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SANCTIONED\_SKIPS

# Variable: SANCTIONED\_SKIPS

> `const` **SANCTIONED\_SKIPS**: readonly [`SanctionedSkip`](../interfaces/SanctionedSkip.md)[]

Defined in: [gauntlet/src/gates/skip-allowlist.ts:270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L270)

THE ENUMERATED ALLOWLIST — every sanctioned capability-gated skip in `tests/`
(outside `tests/generated/`, which the separate plumb-gate owns), at SITE granularity.
Each entry was found by sweeping the test tree for every skip form (`it.skip` /
`test.skip` / `describe.skipIf` / `it.runIf` / the `cond ? it : it.skip` alias) with
the SAME [detectSkips](../functions/detectSkips.md) detector the gate uses, then pinning the exact skip line.
A skip whose `(file, site)` is NOT enumerated is a BLOCKING finding — that is the whole
point: the legit skips are explicit at site granularity, every other skip (including a
NEW one in a sanctioned file) is a lie caught.

Sorted by file (then site) for a stable, reviewable surface (the standards extractor
re-sorts by the canonical element key regardless).
