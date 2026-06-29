[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SymbolOrphanCoverage

# Interface: SymbolOrphanCoverage

Defined in: [audit/src/types.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L42)

Symbol-level orphan evidence (CUT A6) — finer than [OrphanCoverage](OrphanCoverage.md).

## Properties

### candidateCount

> `readonly` **candidateCount**: `number`

Defined in: [audit/src/types.ts:49](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L49)

Exported but unreferenced despite the file being reached — the file-proxy gap.

***

### consumedCount

> `readonly` **consumedCount**: `number`

Defined in: [audit/src/types.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L45)

Exact-name references (incl. barrel re-exports) — proven consumed.

***

### coverage

> `readonly` **coverage**: `"symbol-evidenced"`

Defined in: [audit/src/types.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L43)

***

### note

> `readonly` **note**: `string`

Defined in: [audit/src/types.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L50)

***

### starCoveredCount

> `readonly` **starCoveredCount**: `number`

Defined in: [audit/src/types.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/types.ts#L47)

Covered only by a namespace/`*` import — broad evidence, not exact proof.
