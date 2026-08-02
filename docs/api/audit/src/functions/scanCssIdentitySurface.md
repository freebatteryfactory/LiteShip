[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / scanCssIdentitySurface

# Function: scanCssIdentitySurface()

> **scanCssIdentitySurface**(`files`, `options?`): [`CssIdentityScanResult`](../interfaces/CssIdentityScanResult.md)

Defined in: [audit/src/css-identity-surface.ts:271](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/css-identity-surface.ts#L271)

Scan template literals whose static text opens a boundary-identity selector.

## Parameters

### files

readonly [`CssIdentitySource`](../interfaces/CssIdentitySource.md)[]

### options?

[`CssIdentityScanOptions`](../interfaces/CssIdentityScanOptions.md) = `{}`

## Returns

[`CssIdentityScanResult`](../interfaces/CssIdentityScanResult.md)
