[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SYMBOL\_REFERENCE\_COUNT\_PROPERTY

# Variable: SYMBOL\_REFERENCE\_COUNT\_PROPERTY

> `const` **SYMBOL\_REFERENCE\_COUNT\_PROPERTY**: `"symbol-reference-count"` = `'symbol-reference-count'`

Defined in: [audit/src/repo-ir-language-service.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L72)

The `symbol-reference-count` property: a number fact carrying the count of
references OUTSIDE the symbol's declaration file (the cross-file reference
count the LanguageService resolved). Carried alongside `symbol-orphan` so a
reader sees the magnitude, not just the boolean.
