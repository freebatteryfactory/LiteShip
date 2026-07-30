[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / SymbolOrphanCoverage

# Interface: SymbolOrphanCoverage

Defined in: [audit/src/types.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L58)

Symbol-level orphan evidence (CUT A6) — finer than [OrphanCoverage](OrphanCoverage.md).

## Properties

### candidateCount

> `readonly` **candidateCount**: `number`

Defined in: [audit/src/types.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L65)

Exported but unreferenced despite the file being reached — the file-proxy gap.

***

### consumedCount

> `readonly` **consumedCount**: `number`

Defined in: [audit/src/types.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L61)

Exact-name references (incl. barrel re-exports) — proven consumed.

***

### coverage

> `readonly` **coverage**: `"symbol-evidenced"`

Defined in: [audit/src/types.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L59)

***

### note

> `readonly` **note**: `string`

Defined in: [audit/src/types.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L66)

***

### starCoveredCount

> `readonly` **starCoveredCount**: `number`

Defined in: [audit/src/types.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L63)

Covered only by a namespace/`*` import — broad evidence, not exact proof.
