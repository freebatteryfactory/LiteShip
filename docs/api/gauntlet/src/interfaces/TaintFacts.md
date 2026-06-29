[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TaintFacts

# Interface: TaintFacts

Defined in: [gauntlet/src/taint-facts.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L41)

The host-supplied taint evidence over one run. The taint oracle is HEAVY (a
whole-corpus `ts.Program` + a checker walk + reference queries), so production
runs it OPT-IN (`czap check --ir --taint`), cached; when the host did not run
taint this whole capability is simply ABSENT from the GateContext and the gate
is not in the set (no cost, no noise). When present it carries every traced
flow plus the depth the trace actually covered — the HONEST under-approximation
bound the gate surfaces in its report (a deeper flow the bounded trace cannot
follow is NOT claimed clean; it is simply not a fact, and the depth says so).

## Properties

### flows

> `readonly` **flows**: readonly [`TaintFlow`](TaintFlow.md)[]

Defined in: [gauntlet/src/taint-facts.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L43)

Every traced source→sink flow — the substrate the gate folds.

***

### interproceduralDepth

> `readonly` **interproceduralDepth**: `number`

Defined in: [gauntlet/src/taint-facts.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L54)

The interprocedural hop depth the oracle's trace actually covered (the honest
under-approximation bound). `0` ⇒ intra-procedural only (a source and a sink
in the same function body, through direct assignments). `n > 0` ⇒ the trace
additionally followed up to `n` call-return / parameter hops. A flow that
would only surface at a HIGHER depth is NOT in `flows` and is NOT claimed
clean — the gate's report states this bound so "0 unsanitized flows" can never
be read as "provably no taint at any depth". Carried as data so the report is
self-describing.
