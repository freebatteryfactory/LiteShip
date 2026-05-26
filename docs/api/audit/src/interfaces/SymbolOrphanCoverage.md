[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SymbolOrphanCoverage

# Interface: SymbolOrphanCoverage

Defined in: [audit/src/types.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L47)

Symbol-level orphan evidence (CUT A6) — finer than [OrphanCoverage](OrphanCoverage.md).

## Properties

### candidateCount

> `readonly` **candidateCount**: `number`

Defined in: [audit/src/types.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L54)

Exported but unreferenced despite the file being reached — the file-proxy gap.

***

### consumedCount

> `readonly` **consumedCount**: `number`

Defined in: [audit/src/types.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L50)

Exact-name references (incl. barrel re-exports) — proven consumed.

***

### coverage

> `readonly` **coverage**: `"symbol-evidenced"`

Defined in: [audit/src/types.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L48)

***

### note

> `readonly` **note**: `string`

Defined in: [audit/src/types.ts:55](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L55)

***

### starCoveredCount

> `readonly` **starCoveredCount**: `number`

Defined in: [audit/src/types.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L52)

Covered only by a namespace/`*` import — broad evidence, not exact proof.
