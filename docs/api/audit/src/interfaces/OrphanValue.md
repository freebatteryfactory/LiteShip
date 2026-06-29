[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / OrphanValue

# Interface: OrphanValue

Defined in: [audit/src/repo-ir-language-service.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L82)

The structured payload of a `symbol-orphan` fact's `value` — the heterogeneous
[Fact.value](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts) for this oracle. It carries the symbol NAME and the resolved
external reference count alongside the orphan boolean, so the divergence gate
can (a) reconstruct the `<file>#<name>` [SymbolId](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts) to join against the
IR's `refs` index and (b) report the magnitude. `value` is `unknown` on the
Fact, so the consumer MUST narrow to this shape before reading it.

## Properties

### externalReferenceCount

> `readonly` **externalReferenceCount**: `number`

Defined in: [audit/src/repo-ir-language-service.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L88)

The count of references OUTSIDE the declaration file (the external count).

***

### isOrphan

> `readonly` **isOrphan**: `boolean`

Defined in: [audit/src/repo-ir-language-service.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L86)

True iff the LanguageService resolved ZERO references outside the decl file.

***

### name

> `readonly` **name**: `string`

Defined in: [audit/src/repo-ir-language-service.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L84)

The exported symbol's declared name (the `#<name>` half of its SymbolId).
