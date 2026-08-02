[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / CssIdentityScanOptions

# Interface: CssIdentityScanOptions

Defined in: [audit/src/css-identity-surface.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/css-identity-surface.ts#L85)

Host-injected policy: the engine stays lean and never names a project package.

## Properties

### approvedEscapeSpecifiers?

> `readonly` `optional` **approvedEscapeSpecifiers?**: readonly `string`[]

Defined in: [audit/src/css-identity-surface.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/css-identity-surface.ts#L91)

Package specifiers whose named `escapeCssString` re-exports an approved
declaration. Repo-relative definer paths are the engine's own anchor
domain; PACKAGE specifiers are project policy, so the host supplies them.
