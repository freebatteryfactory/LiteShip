[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / Fact

# Interface: Fact

Defined in: [gauntlet/src/repo-ir.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L240)

The oracle-emitted tuple (design §2). An oracle emits a `Fact` per
`(file, line, property)` it observes, tagged with WHICH oracle saw it and the
coverage class of that observation. The triangulation layer (a later B1 step)
groups facts by `(file, line, property)` and emits a self-explaining
divergence Finding when two oracles disagree.

`value` is the ONE sanctioned `unknown` in this module. It is a HETEROGENEOUS
fact payload: different `property`/`oracleId` pairs carry different value
types (a boolean `isDefaultExport`, a string `returnType`, a number
`frameCount`). It is `unknown` — NOT `any` — precisely so a consumer CANNOT
read it blindly: a divergence check MUST narrow by `property`/`oracleId`
before touching it (`unknown` forces the guard; `any` would silently skip it).
This is the open extension point — a downstream oracle adds new
`property`/`value` pairs without changing this interface.

## Properties

### coverageClass

> `readonly` **coverageClass**: [`CoverageClass`](../type-aliases/CoverageClass.md)

Defined in: [gauntlet/src/repo-ir.ts:252](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L252)

How this observation was evidenced.

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/repo-ir.ts:242](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L242)

The file the fact concerns — MUST exist in [RepoIR.files](RepoIR.md#files).

***

### line?

> `readonly` `optional` **line?**: `number`

Defined in: [gauntlet/src/repo-ir.ts:244](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L244)

The line, when the fact is line-located.

***

### oracleId

> `readonly` **oracleId**: `string`

Defined in: [gauntlet/src/repo-ir.ts:250](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L250)

Which oracle emitted this — the traceability + triangulation key.

***

### property

> `readonly` **property**: `string`

Defined in: [gauntlet/src/repo-ir.ts:246](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L246)

The named property observed (e.g. `'isDefaultExport'`, `'returnType'`).

***

### value

> `readonly` **value**: `unknown`

Defined in: [gauntlet/src/repo-ir.ts:248](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L248)

The heterogeneous payload — narrow by `property`/`oracleId` before use.
