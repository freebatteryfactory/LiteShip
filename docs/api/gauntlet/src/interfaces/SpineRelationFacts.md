[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SpineRelationFacts

# Interface: SpineRelationFacts

Defined in: [gauntlet/src/facts/spine-relation-facts.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/spine-relation-facts.ts#L99)

The host-supplied two-axis classification over the admitted spine mirror set. The
probe is HEAVY (a `ts.Program` per build, one bidirectional assertion per admitted
type), so production runs it OPT-IN + cached; when the host did not run it this
whole capability is simply ABSENT from the [GateContext](GateContext.md) and the gate is not
in the set (no cost, no noise).

## Properties

### observations

> `readonly` **observations**: readonly [`SpineRelationObservation`](SpineRelationObservation.md)[]

Defined in: [gauntlet/src/facts/spine-relation-facts.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/spine-relation-facts.ts#L101)

Every admitted mirror type's observed relation — the substrate the gate folds.
