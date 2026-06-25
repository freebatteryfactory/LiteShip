[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ProofFacts

# Interface: ProofFacts

Defined in: [gauntlet/src/proof-facts.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/proof-facts.ts#L45)

The proof evidence the host supplies — one [ModuleProof](ModuleProof.md) per IR file the
host could measure. The host blends the proof signals (mutation score, coverage,
has-property-test, enrolled-invariant) into the normalized `localProof` scalar;
the gate propagates it. A file ABSENT from `modules` has no measured local proof
— the gate treats it as the documented [UNMEASURED\_PROOF](../variables/UNMEASURED_PROOF.md) floor (an
unmeasured dependency is the WEAKEST possible link, the sound direction: it can
only LOWER an effective proof, never inflate it). An empty/absent `modules` is
reported by the gate as an advisory "not-evidenced" finding (honest
under-coverage, never a silent green) — see [proofPropagationGate](../variables/proofPropagationGate.md).

## Properties

### modules?

> `readonly` `optional` **modules?**: readonly [`ModuleProof`](ModuleProof.md)[]

Defined in: [gauntlet/src/proof-facts.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/proof-facts.ts#L47)

Every module the host measured a local proof scalar for.
