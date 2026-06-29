[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / Fact

# Interface: Fact

Defined in: [gauntlet/src/repo-ir.ts:239](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L239)

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

Defined in: [gauntlet/src/repo-ir.ts:251](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L251)

How this observation was evidenced.

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/repo-ir.ts:241](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L241)

The file the fact concerns — MUST exist in [RepoIR.files](RepoIR.md#files).

***

### line?

> `readonly` `optional` **line?**: `number`

Defined in: [gauntlet/src/repo-ir.ts:243](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L243)

The line, when the fact is line-located.

***

### oracleId

> `readonly` **oracleId**: `string`

Defined in: [gauntlet/src/repo-ir.ts:249](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L249)

Which oracle emitted this — the traceability + triangulation key.

***

### property

> `readonly` **property**: `string`

Defined in: [gauntlet/src/repo-ir.ts:245](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L245)

The named property observed (e.g. `'isDefaultExport'`, `'returnType'`).

***

### value

> `readonly` **value**: `unknown`

Defined in: [gauntlet/src/repo-ir.ts:247](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L247)

The heterogeneous payload — narrow by `property`/`oracleId` before use.
