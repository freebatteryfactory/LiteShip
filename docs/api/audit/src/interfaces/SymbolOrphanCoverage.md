[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / SymbolOrphanCoverage

# Interface: SymbolOrphanCoverage

Defined in: [audit/src/types.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L71)

Symbol-level orphan evidence (CUT A6) — finer than [OrphanCoverage](OrphanCoverage.md).

## Properties

### candidateCount

> `readonly` **candidateCount**: `number`

Defined in: [audit/src/types.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L78)

Exported but unreferenced despite the file being reached — the file-proxy gap.

***

### consumedCount

> `readonly` **consumedCount**: `number`

Defined in: [audit/src/types.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L74)

Exact-name references (incl. barrel re-exports) — proven consumed.

***

### coverage

> `readonly` **coverage**: `"symbol-evidenced"`

Defined in: [audit/src/types.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L72)

***

### note

> `readonly` **note**: `string`

Defined in: [audit/src/types.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L79)

***

### starCoveredCount

> `readonly` **starCoveredCount**: `number`

Defined in: [audit/src/types.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L76)

Covered only by a namespace/`*` import — broad evidence, not exact proof.
