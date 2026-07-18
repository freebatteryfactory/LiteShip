[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SurfaceReader

# Interface: SurfaceReader

Defined in: [audit/src/type-export-surface.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L75)

The filesystem seam the enumerator reads through — injectable so the walk is a
pure unit under test (a virtual file map) and policy-free in production (the
real `fs`).

## Methods

### fileExists()

> **fileExists**(`path`): `boolean`

Defined in: [audit/src/type-export-surface.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L77)

#### Parameters

##### path

`string`

#### Returns

`boolean`

***

### readFile()

> **readFile**(`path`): `string`

Defined in: [audit/src/type-export-surface.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L76)

#### Parameters

##### path

`string`

#### Returns

`string`
