[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SymbolOrphanCoverage

# Interface: SymbolOrphanCoverage

Defined in: [audit/src/types.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L66)

Symbol-level orphan evidence (CUT A6) — finer than [OrphanCoverage](OrphanCoverage.md).

## Properties

### candidateCount

> `readonly` **candidateCount**: `number`

Defined in: [audit/src/types.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L73)

Exported but unreferenced despite the file being reached — the file-proxy gap.

***

### consumedCount

> `readonly` **consumedCount**: `number`

Defined in: [audit/src/types.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L69)

Exact-name references (incl. barrel re-exports) — proven consumed.

***

### coverage

> `readonly` **coverage**: `"symbol-evidenced"`

Defined in: [audit/src/types.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L67)

***

### note

> `readonly` **note**: `string`

Defined in: [audit/src/types.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L74)

***

### starCoveredCount

> `readonly` **starCoveredCount**: `number`

Defined in: [audit/src/types.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L71)

Covered only by a namespace/`*` import — broad evidence, not exact proof.
