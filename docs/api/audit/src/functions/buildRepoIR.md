[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildRepoIR

# Function: buildRepoIR()

> **buildRepoIR**(`profile?`, `options?`): [`RepoIR`](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts)

Defined in: [audit/src/repo-ir-build.ts:334](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L334)

Build a real [RepoIR](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts) from a [DevopsProfile](../interfaces/DevopsProfile.md) — the host-side
materialization. Pure and deterministic: same source bytes → identical IR.

## Parameters

### profile?

[`DevopsProfile`](../interfaces/DevopsProfile.md) = `liteshipDevopsProfile`

The audit profile (`profile.repoRoot` is the authoritative
  target). Defaults to the LiteShip reference profile.

### options?

[`BuildRepoIROptions`](../interfaces/BuildRepoIROptions.md) = `{}`

Host-injection surface. `extraFactOracles` are the host-supplied
  [FactOracle](../type-aliases/FactOracle.md)s (e.g. the CLI's LiteShip `invariant-regex` oracle) whose
  facts merge into the IR alongside audit's own structural AST facts. The audit
  engine itself imports no repo-local rule set — the boundary is the hook.

## Returns

[`RepoIR`](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts)
