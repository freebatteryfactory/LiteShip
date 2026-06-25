[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / isMcdcCovered

# Function: isMcdcCovered()

> **isMcdcCovered**(`outcome`): `boolean`

Defined in: [gauntlet/src/mcdc-facts.ts:96](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/mcdc-facts.ts#L96)

Is a condition MC/DC-COVERED? Both pins must be KILLED — the suite distinguishes the
condition being true from being false at the decision (the independent-effect pair).
Any survived/no-coverage pin ⇒ not covered ⇒ an MC/DC gap. A pure predicate over the
folded outcome (no I/O), exported so the gate and the host's score share ONE rule.

## Parameters

### outcome

[`McdcConditionOutcome`](../interfaces/McdcConditionOutcome.md)

## Returns

`boolean`
