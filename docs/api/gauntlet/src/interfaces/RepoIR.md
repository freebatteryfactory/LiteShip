[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / RepoIR

# Interface: RepoIR

Defined in: [gauntlet/src/repo-ir.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L264)

The repo-IR — one immutable, content-addressed value per run. ECS-shaped:
parallel typed tables keyed by stable ids. A gate folds over these tables
instead of re-scanning the corpus.

`levels` is OPTIONAL and DEFERRED: assurance-level propagation along
call/import edges is B3 work (the `assurance-map.ts` "propagate along call
edges" item). B1 ships the IR without it.

## Properties

### benchmarkSubjects?

> `readonly` `optional` **benchmarkSubjects?**: [`BenchmarkSubjectFacts`](BenchmarkSubjectFacts.md)

Defined in: [gauntlet/src/repo-ir.ts:280](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L280)

Optional host-qualified benchmark reachability evidence for this repository image.

***

### facts

> `readonly` **facts**: readonly [`Fact`](Fact.md)[]

Defined in: [gauntlet/src/repo-ir.ts:278](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L278)

The oracle-emitted facts — the substrate the triangulation layer folds.

***

### files

> `readonly` **files**: `ReadonlyMap`\<`string`, [`FileNode`](FileNode.md)\>

Defined in: [gauntlet/src/repo-ir.ts:266](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L266)

The file table, keyed by [FileId](../type-aliases/FileId.md).

***

### imports

> `readonly` **imports**: readonly [`ImportEdge`](ImportEdge.md)[]

Defined in: [gauntlet/src/repo-ir.ts:270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L270)

The import graph as a flat edge list.

***

### levels?

> `readonly` `optional` **levels?**: `ReadonlyMap`\<`string`, [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)\>

Defined in: [gauntlet/src/repo-ir.ts:276](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L276)

Assurance levels propagated along edges — DEFERRED to B3 (optional).

***

### packages

> `readonly` **packages**: `ReadonlyMap`\<`string`, [`PackageNode`](PackageNode.md)\>

Defined in: [gauntlet/src/repo-ir.ts:272](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L272)

The package table, keyed by [PkgName](../type-aliases/PkgName.md).

***

### refs

> `readonly` **refs**: `ReadonlyMap`\<`string`, readonly [`RefSite`](RefSite.md)[]\>

Defined in: [gauntlet/src/repo-ir.ts:274](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L274)

The reverse-reference index — symbol → the sites that reference it.

***

### symbols

> `readonly` **symbols**: `ReadonlyMap`\<`string`, [`SymbolNode`](SymbolNode.md)\>

Defined in: [gauntlet/src/repo-ir.ts:268](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L268)

The symbol table, keyed by [SymbolId](../type-aliases/SymbolId.md).
