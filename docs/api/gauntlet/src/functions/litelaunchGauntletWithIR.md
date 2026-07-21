[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / litelaunchGauntletWithIR

# Function: litelaunchGauntletWithIR()

> **litelaunchGauntletWithIR**(`repoRoot`, `now`, `ir`, `globs?`, `cacheOpts?`): [`GauntletResult`](../interfaces/GauntletResult.md)

Defined in: [gauntlet/src/runner.ts:476](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L476)

The HOST gauntlet run (Slice B, B1, step 3) — the IR-INJECTED composition the
CLI calls once it has built the repo-IR via `@liteship/audit`. Binds
[LITESHIP\_IR\_GATES](../variables/LITESHIP_IR_GATES.md) (the lean set with no-bare-throw re-expressed as an IR
fold + the oracle-divergence gate) and threads the REQUIRED `ir` onto every
gate's context, with the same committed assurance map + waivers + injected
clock as [litelaunchGauntlet](litelaunchGauntlet.md).

The `ir` is mandatory here (the IR-fold gates [requireIR](requireIR.md)); the lean path
keeps calling [litelaunchGauntlet](litelaunchGauntlet.md) with no IR and runs the six regex gates
unchanged. This is the ONE place the IR-fold gates run — so the engine stays
lean (no `typescript`) and the lean MCP/command path is unaffected.

B3.4 — ASSURANCE-LEVEL EDGE PROPAGATION: because the IR is present, this run
PROPAGATES assurance levels along the import graph ("AUTHORITY decides
assurance, not folder names"): a file (transitively) imported by an L4 file
inherits at least L4. The propagated effective levels (floored by the glob map,
raised along import edges via [propagateAssuranceLevels](propagateAssuranceLevels.md)) are threaded into
the engine as `effectiveLevels`, where they drive BOTH level-scoping (a file
pulled into an L4 path is in an L4 gate's band) AND finding-level elevation (a
finding on such a file is reported at L4). The lean [litelaunchGauntlet](litelaunchGauntlet.md)
path has no IR and so no propagation — its glob-only levels are unchanged.

## Parameters

### repoRoot

`string`

### now

`Date`

### ir

[`RepoIR`](../interfaces/RepoIR.md)

### globs?

readonly `string`[] = `DEFAULT_GAUNTLET_GLOBS`

### cacheOpts?

[`LitelaunchCacheOptions`](../interfaces/LitelaunchCacheOptions.md) = `{}`

## Returns

[`GauntletResult`](../interfaces/GauntletResult.md)
