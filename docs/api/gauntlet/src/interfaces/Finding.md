[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / Finding

# Interface: Finding

Defined in: [gauntlet/src/finding.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L54)

The gate output. `ruleId` traces to the gate that produced it; `level` is the
assurance level of the code it concerns (rigor-aiming); `detail` is the WHY
(not just the what); `remediation` is the actionable fix.

## Properties

### coverageClass?

> `readonly` `optional` **coverageClass?**: [`CoverageClass`](../type-aliases/CoverageClass.md)

Defined in: [gauntlet/src/finding.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L75)

How the evidence behind this finding was classified (Slice B). A
triangulation/divergence finding carries it — it is the explanation of WHY
two oracles can disagree (`text-only` regex vs `symbol-evidenced` checker).
Existing regex gates omit it (additive, non-breaking). See [CoverageClass](../type-aliases/CoverageClass.md).

***

### detail

> `readonly` **detail**: `string`

Defined in: [gauntlet/src/finding.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L64)

The WHY — enough for a human or agent to understand without the source.

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/finding.ts:60](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L60)

Assurance level of the concerned code — aims rigor + groups the report.

***

### location?

> `readonly` `optional` **location?**: [`SourceLocation`](SourceLocation.md)

Defined in: [gauntlet/src/finding.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L66)

Where it points, when it points at source.

***

### remediation?

> `readonly` `optional` **remediation?**: [`Remediation`](../type-aliases/Remediation.md)

Defined in: [gauntlet/src/finding.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L68)

The actionable fix — a machine-applicable patch or a precise work-list.

***

### ruleId

> `readonly` **ruleId**: `string`

Defined in: [gauntlet/src/finding.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L56)

Stable id of the rule/gate that produced this — the traceability anchor.

***

### severity

> `readonly` **severity**: [`Severity`](../type-aliases/Severity.md)

Defined in: [gauntlet/src/finding.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L58)

How loud: advisory (calibrating) / warning / error (blocks).

***

### title

> `readonly` **title**: `string`

Defined in: [gauntlet/src/finding.ts:62](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L62)

Short human summary.
