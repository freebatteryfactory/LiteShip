[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildRepoIRTaint

# Function: buildRepoIRTaint()

> **buildRepoIRTaint**(`registry`, `options?`): [`TaintFacts`](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts)

Defined in: [audit/src/repo-ir-taint.ts:732](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L732)

Build the GENERIC taint facts for a repo — the host-side materialization. Pure +
deterministic: same source bytes + same registry → identical [TaintFacts](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts).

The SOURCE / SINK / SANITIZER classification is INJECTED via `registry` — the
oracle references NO LiteShip-specific name (ADR-0012 / D7b). The depth bound is
carried into the facts so the report is HONEST about what was (and was not)
traced. Throws a tagged [InvariantViolationError](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts) (never a bare throw) when
a non-empty corpus yields no program.

## Parameters

### registry

[`TaintRegistry`](../interfaces/TaintRegistry.md)

The host-injected source/sink/sanitizer classification.

### options?

[`BuildRepoIRTaintOptions`](../interfaces/BuildRepoIRTaintOptions.md) = `{}`

The profile seam + the interprocedural depth bound.

## Returns

[`TaintFacts`](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts)
