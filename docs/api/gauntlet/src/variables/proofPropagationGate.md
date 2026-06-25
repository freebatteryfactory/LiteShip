[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / proofPropagationGate

# Variable: proofPropagationGate

> `const` **proofPropagationGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/proof-propagation.ts:425](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/proof-propagation.ts#L425)

The proof-propagation gate — each trust-spine module whose EFFECTIVE (global) proof
drops below its level floor BECAUSE of a weak dependency becomes a self-explaining
Finding naming the exact weak-link path. REPORT-not-DECIDE. It reads the IR (dep DAG
+ level propagation) + folds the host-injected ProofFacts (advisory when absent), so
it runs only on the opt-in host `--proof` path. Earns blocking authority via the
existing ratchet.
