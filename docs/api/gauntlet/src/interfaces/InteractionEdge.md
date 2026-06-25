[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / InteractionEdge

# Interface: InteractionEdge

Defined in: [gauntlet/src/composition-facts.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L70)

One interaction edge `from → to` between two individually-tested units, with the
host's integration-coverage verdict. By construction every edge here has BOTH
endpoints individually tested (the host filters to those — an edge whose endpoint
is itself untested is a different, weaker finding the proof-propagation family
owns); the only question this edge answers is whether the COMPOSITION is covered
TOGETHER. An `integrationCovered: false` edge is the finding.

## Properties

### evidence

> `readonly` **evidence**: [`CoverageEvidence`](../type-aliases/CoverageEvidence.md)

Defined in: [gauntlet/src/composition-facts.ts:94](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L94)

How the integration-coverage verdict was evidenced — the honesty knob. A
`covered` edge carries the evidence class that decided it; an `uncovered` edge
carries the strongest class the host SEARCHED (so the finding states what was
looked for and not found).

***

### fromFile

> `readonly` **fromFile**: `string`

Defined in: [gauntlet/src/composition-facts.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L72)

The calling unit's file id — MUST be an IR file (the gate aims the level + reads deps).

***

### integrationCovered

> `readonly` **integrationCovered**: `boolean`

Defined in: [gauntlet/src/composition-facts.ts:87](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L87)

Whether an integration test exercises BOTH endpoints together. `false` is the
finding (a locally-green, globally-untested interaction). When `true`, the
[evidence](#evidence) states HOW it was decided (precise execution vs the static
over-approximation), so a "covered" verdict can never be read as stronger than
the proxy that produced it.

***

### toFile

> `readonly` **toFile**: `string`

Defined in: [gauntlet/src/composition-facts.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L74)

The called unit's file id — MUST be an IR file.

***

### viaSymbol

> `readonly` **viaSymbol**: `string`

Defined in: [gauntlet/src/composition-facts.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L79)

The symbol in `toFile` that `fromFile` calls/references (names WHAT the
interaction is, so the finding is concrete — `applyPatch`, not just `to.ts`).
