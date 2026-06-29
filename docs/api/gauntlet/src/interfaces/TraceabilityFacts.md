[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TraceabilityFacts

# Interface: TraceabilityFacts

Defined in: [gauntlet/src/traceability-facts.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L127)

The host-supplied traceability evidence over one run — every declared invariant's
resolved state, every detected ledger⇔header divergence, and the content address
of the resolved ledger (so DRIFT in the resolved trace is itself detectable).

The whole capability is OPTIONAL on the [GateContext](GateContext.md): a lean run (no host)
leaves it ABSENT and the bridge gate is simply not in the set — no YAML parse, no
corpus scan, no cost. When PRESENT, the gate folds it into Findings.

## Properties

### divergences

> `readonly` **divergences**: readonly [`TraceabilityDivergence`](TraceabilityDivergence.md)[]

Defined in: [gauntlet/src/traceability-facts.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L131)

Every ledger⇔header divergence (sorted) — the bidirectional-trace check.

***

### invariants

> `readonly` **invariants**: readonly [`ResolvedInvariant`](ResolvedInvariant.md)[]

Defined in: [gauntlet/src/traceability-facts.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L129)

Every declared invariant + its resolved lifecycle state (sorted by id).

***

### ledgerAddress

> `readonly` **ledgerAddress**: `string`

Defined in: [gauntlet/src/traceability-facts.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L137)

The content address (fnv1a over the canonical resolved ledger) the host minted —
the drift keystone. Two runs over the same ledger+corpus+date produce the same
address; a change re-addresses. Carried for the report/receipt, not the verdict.
