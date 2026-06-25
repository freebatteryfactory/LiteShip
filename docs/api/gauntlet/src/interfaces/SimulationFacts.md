[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SimulationFacts

# Interface: SimulationFacts

Defined in: [gauntlet/src/simulation-facts.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/simulation-facts.ts#L33)

The DST evidence the host supplies — the result of running the scenario corpus
through the `@czap/core/simulation` harness. `runs` is EVERY scenario the host
replayed; an empty/absent `runs` is reported by the gate as an advisory
"not-evidenced" finding (honest under-coverage, never a silent green) — see
[simulationDeterminismGate](../variables/simulationDeterminismGate.md).

## Properties

### runs?

> `readonly` `optional` **runs?**: readonly [`ScenarioReplayFact`](ScenarioReplayFact.md)[]

Defined in: [gauntlet/src/simulation-facts.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/simulation-facts.ts#L35)

Every scenario the host replayed through the harness.
