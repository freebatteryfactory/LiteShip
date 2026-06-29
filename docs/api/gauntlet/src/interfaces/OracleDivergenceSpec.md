[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / OracleDivergenceSpec

# Interface: OracleDivergenceSpec

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L62)

The per-property descriptor — the ONLY thing that varies between the three
divergence gates. Everything else (the fold, the grouping, the exclude-vs-miss
refinement, the self-proof fixtures) is shared by [makeOracleDivergenceGate](../functions/makeOracleDivergenceGate.md).

## Properties

### astSawStep

> `readonly` **astSawStep**: `string`

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L88)

The remediation step for the AST-present/regex-absent direction.

***

### astSawWhy

> `readonly` **astSawWhy**: `string`

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L86)

The prose explaining an AST-present/regex-absent divergence — the case the
AST caught a REAL form the comment-blind regex missed (per-rule, because the
forms differ: `export =` vs the keyword regex; a real `var` the regex's word
boundary missed, etc.).

***

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L79)

The one-line gate description.

***

### excludedMarkerProperty

> `readonly` **excludedMarkerProperty**: `string`

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L73)

The property a host oracle emits to record a POLICY EXCLUDE for this rule (the
exclude-vs-miss seam — e.g. `default-export-check-excluded`,
`var-check-excluded`). A file carrying this marker is a sanctioned exclude:
the regex's silence there is by design, not a coverage miss.

***

### gateId

> `readonly` **gateId**: `string`

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L64)

The gate id; namespaces every finding (traceability).

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L75)

The assurance level the gate operates at.

***

### property

> `readonly` **property**: `string`

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L66)

The property both oracles observe (e.g. `is-default-export`, `var-declaration`).

***

### subject

> `readonly` **subject**: `string`

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L77)

A short human name for the thing checked (e.g. a default export, a legacy binding).
