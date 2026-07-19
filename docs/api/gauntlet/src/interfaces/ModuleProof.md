[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ModuleProof

# Interface: ModuleProof

Defined in: [gauntlet/src/facts/proof-facts.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/proof-facts.ts#L56)

One module's blended LOCAL proof scalar + the signal breakdown the finding
shows. `localProof` is in `[0, 1]` (0 = unproven, 1 = fully proven); the
breakdown is the evidence the host blended, surfaced so the reader sees WHY a
module's local proof is what it is (never a bare opaque number).

## Properties

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/facts/proof-facts.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/proof-facts.ts#L58)

The repo-relative file id — MUST be an IR file (the gate aims its level + reads its deps).

***

### localProof

> `readonly` **localProof**: `number`

Defined in: [gauntlet/src/facts/proof-facts.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/proof-facts.ts#L64)

The blended local proof scalar in `[0, 1]` — the host's normalized combination
of [ProofSignals](ProofSignals.md). The gate does NOT recompute it (ADR-0012: the host
computes, the engine folds); it propagates it along the dep DAG.

***

### signals

> `readonly` **signals**: [`ProofSignals`](ProofSignals.md)

Defined in: [gauntlet/src/facts/proof-facts.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/proof-facts.ts#L66)

The individual proof signals the host blended — the self-explaining breakdown.
