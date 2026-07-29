[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / Finding

# Interface: Finding

Defined in: gauntlet/dist/finding.d.ts:54

The gate output. `ruleId` traces to the gate that produced it; `level` is the
assurance level of the code it concerns (rigor-aiming); `detail` is the WHY
(not just the what); `remediation` is the actionable fix.

## Properties

### coverageClass?

> `readonly` `optional` **coverageClass?**: [`CoverageClass`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/finding.ts)

Defined in: gauntlet/dist/finding.d.ts:75

How the evidence behind this finding was classified (Slice B). A
triangulation/divergence finding carries it — it is the explanation of WHY
two oracles can disagree (`text-only` regex vs `symbol-evidenced` checker).
Existing regex gates omit it (additive, non-breaking). See [CoverageClass](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/finding.ts).

***

### detail

> `readonly` **detail**: `string`

Defined in: gauntlet/dist/finding.d.ts:64

The WHY — enough for a human or agent to understand without the source.

***

### level

> `readonly` **level**: `AssuranceLevel`

Defined in: gauntlet/dist/finding.d.ts:60

Assurance level of the concerned code — aims rigor + groups the report.

***

### location?

> `readonly` `optional` **location?**: `SourceLocation`

Defined in: gauntlet/dist/finding.d.ts:66

Where it points, when it points at source.

***

### remediation?

> `readonly` `optional` **remediation?**: `Remediation`

Defined in: gauntlet/dist/finding.d.ts:68

The actionable fix — a machine-applicable patch or a precise work-list.

***

### ruleId

> `readonly` **ruleId**: `string`

Defined in: gauntlet/dist/finding.d.ts:56

Stable id of the rule/gate that produced this — the traceability anchor.

***

### severity

> `readonly` **severity**: `Severity`

Defined in: gauntlet/dist/finding.d.ts:58

How loud: advisory (calibrating) / warning / error (blocks).

***

### title

> `readonly` **title**: `string`

Defined in: gauntlet/dist/finding.d.ts:62

Short human summary.
