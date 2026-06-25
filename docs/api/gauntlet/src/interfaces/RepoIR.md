[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / RepoIR

# Interface: RepoIR

Defined in: [gauntlet/src/repo-ir.ts:263](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L263)

The repo-IR — one immutable, content-addressed value per run. ECS-shaped:
parallel typed tables keyed by stable ids. A gate folds over these tables
instead of re-scanning the corpus.

`levels` is OPTIONAL and DEFERRED: assurance-level propagation along
call/import edges is B3 work (the `assurance-map.ts` "propagate along call
edges" item). B1 ships the IR without it.

## Properties

### facts

> `readonly` **facts**: readonly [`Fact`](Fact.md)[]

Defined in: [gauntlet/src/repo-ir.ts:277](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L277)

The oracle-emitted facts — the substrate the triangulation layer folds.

***

### files

> `readonly` **files**: `ReadonlyMap`\<`string`, [`FileNode`](FileNode.md)\>

Defined in: [gauntlet/src/repo-ir.ts:265](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L265)

The file table, keyed by [FileId](../type-aliases/FileId.md).

***

### imports

> `readonly` **imports**: readonly [`ImportEdge`](ImportEdge.md)[]

Defined in: [gauntlet/src/repo-ir.ts:269](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L269)

The import graph as a flat edge list.

***

### levels?

> `readonly` `optional` **levels?**: `ReadonlyMap`\<`string`, [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)\>

Defined in: [gauntlet/src/repo-ir.ts:275](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L275)

Assurance levels propagated along edges — DEFERRED to B3 (optional).

***

### packages

> `readonly` **packages**: `ReadonlyMap`\<`string`, [`PackageNode`](PackageNode.md)\>

Defined in: [gauntlet/src/repo-ir.ts:271](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L271)

The package table, keyed by [PkgName](../type-aliases/PkgName.md).

***

### refs

> `readonly` **refs**: `ReadonlyMap`\<`string`, readonly [`RefSite`](RefSite.md)[]\>

Defined in: [gauntlet/src/repo-ir.ts:273](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L273)

The reverse-reference index — symbol → the sites that reference it.

***

### symbols

> `readonly` **symbols**: `ReadonlyMap`\<`string`, [`SymbolNode`](SymbolNode.md)\>

Defined in: [gauntlet/src/repo-ir.ts:267](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L267)

The symbol table, keyed by [SymbolId](../type-aliases/SymbolId.md).
