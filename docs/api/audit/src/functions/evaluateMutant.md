[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / evaluateMutant

# Function: evaluateMutant()

> **evaluateMutant**\<`M`\>(`mutant`, `options`): [`MutantVerdict`](../type-aliases/MutantVerdict.md)\<`M`\>

Defined in: [audit/src/mutation-verdict.ts:257](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L257)

Evaluate ONE mutant to its kill/survive/no-coverage verdict — the second oracle's
answer. Pure w.r.t. the injected runner + coverage:
 1. Resolve the deterministic covering tests for the mutant's `(file, line)`.
 2. NO covering test → NO-COVERAGE (untested; the runner is never invoked).
 3. Otherwise reconstruct the mutated source ([applyMutant](applyMutant.md)) and run the
    covering tests through the injected runner: `failed` → KILLED, else SURVIVED.

When a cache + toolchain digest are injected, a HIT short-circuits the runner. The
cache stores only the verdict TAG (the mutant + covering tests are re-resolved
from the inputs, so the cache is a pure speedup, never the source of truth).

## Type Parameters

### M

`M` *extends* [`MutantCore`](../interfaces/MutantCore.md) = [`Mutant`](../interfaces/Mutant.md)

## Parameters

### mutant

`M`

### options

[`EvaluateMutantOptions`](../interfaces/EvaluateMutantOptions.md)

## Returns

[`MutantVerdict`](../type-aliases/MutantVerdict.md)\<`M`\>
