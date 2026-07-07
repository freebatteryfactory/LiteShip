[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / litelaunchGauntlet

# Function: litelaunchGauntlet()

> **litelaunchGauntlet**(`repoRoot`, `now`, `globs?`, `ir?`, `skipDetector?`, `codeOnly?`): [`GauntletResult`](../interfaces/GauntletResult.md)

Defined in: [gauntlet/src/runner.ts:367](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L367)

The PRODUCTION gauntlet run — the live composition the dogfood path calls.

Binds the real built-in [LITESHIP\_GATES](../variables/LITESHIP_GATES.md), the committed
[LITESHIP\_ASSURANCE\_MAP](../variables/LITESHIP_ASSURANCE_MAP.md) (so each gate is aimed at its level), and the
committed [LITESHIP\_WAIVERS](../variables/LITESHIP_WAIVERS.md) (so the declared boundaries are suppressed
and a stale/expired waiver re-reds) into ONE call over the real repo. `now` is
injected — never `Date.now()` — so the waiver-expiry verdict is deterministic
and a test can drive the clock past a boundary review to prove the teeth fire.

This is what makes the committed waivers actually GOVERN: the waivers in
`waivers.ts` are evaluated against the real findings this run surfaces, scoped
per-gate by ruleId in [runGates](runGates.md). A boundary waiver that matches nothing
goes stale (warning); one whose `expires` is past `now` re-reds and blocks.

The optional `ir` is the INJECTED repo-IR (Slice B). The LEAN path (`czap
check` / MCP — `@czap/command/host`) calls this with NO `ir`: the regex gates
run unchanged and an IR-fold gate (Step 3) folds only when an IR is present.
The HOST path (the CLI/scripts, where `@czap/audit` is available) builds the
IR via `buildRepoIR` and threads it here, landing it on every gate's context.

## Parameters

### repoRoot

`string`

Absolute root the gates resolve against.

### now

`Date`

The injected clock for waiver-expiry evaluation (REQUIRED — the
                caller owns the date so the verdict is reproducible).

### globs?

readonly `string`[] = `DEFAULT_GAUNTLET_GLOBS`

The file scope (defaults to every package's source).

### ir?

[`RepoIR`](../interfaces/RepoIR.md)

Optional pre-built repo-IR to inject (the host path).

### skipDetector?

(`source`) => readonly [`SkipMatch`](../interfaces/SkipMatch.md)[]

Optional host-built SOUND AST skip detector (`@czap/audit`'s
                `detectSkipsAST`). The no-skipped-test gate uses it via
                `(context.skipDetector ?? detectSkips)` — so the LEAN path, when run
                from a host that deps `@czap/audit` (the CLI's `czap check` / `czap
                lsp`), gains the line-agnostic multi-line/ASI/inner-describe/alias
                detection + the structural conditionality proof. Omitted on the
                no-`@czap/audit` path (MCP) → the token fallback (the documented lean
                degradation, like `runCheckInvariants`).

### codeOnly?

(`source`) => `string`

## Returns

[`GauntletResult`](../interfaces/GauntletResult.md)
