[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / taintFlowGate

# Variable: taintFlowGate

> `const` **taintFlowGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/taint-flow.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/taint-flow.ts#L166)

The qualified gate — fixtures included, so it self-proves via the ratchet.

- RED: an unsanitized fetch→createShaderModule flow → a blocking `error` finding.
- GREEN: the same flow sanitized by `resolveRuntimeUrl` → ZERO findings (the taint
  is broken — the seam is guarded, so there is nothing to report).
- MUTATION: a gate that treats EVERY flow as clean (ignores `sanitizedBy`) folds
  no finding at all — it leaves the red's unsanitized flow unflagged, so the mutant
  fails the red (it can no longer catch the known-bad flow).
