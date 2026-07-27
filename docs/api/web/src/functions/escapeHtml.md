[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / escapeHtml

# Function: escapeHtml()

> **escapeHtml**(`raw`): `string`

Defined in: [web/src/security/html-trust.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/html-trust.ts#L146)

Escape the five HTML metacharacters (`&`, `<`, `>`, `"`, `'`) so a raw
string is safe to interpolate into element text or a double/single-quoted
attribute value. `&` is replaced first so the ampersands introduced by the
later replacements are not double-escaped.

This is the text-escape primitive behind the `'text'` HTML policy; it is
also the single owner that emitters (`@liteship/mcp-server`, stage) import
instead of re-hand-rolling the same five `replaceAll` chain.

## Parameters

### raw

`string`

## Returns

`string`
