[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / defineToken

# Function: defineToken()

## Call Signature

> **defineToken**\<`N`\>(`config`): `TokenDef`\<`N`, readonly \[\]\>

Defined in: [core/src/authoring/token.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/token.ts#L162)

Define a design token — a named design value that varies across axes (theme,
density, contrast, …).

The token is content-addressed via FNV-1a hash of its name, category, axes,
and values. The resulting object is frozen.

`axes` defaults to `['default']` and `fallback` derives from `values.default`
when omitted, so a single-value token is just
`defineToken({ name, category, values: { default: '#ccc' } })`.

Multi-axis value keys join one value per axis with ':' in alphabetical
axis-name order — for `axes: ['theme', 'contrast']` the key order is
`<contrast>:<theme>` (contrast sorts first).

### Type Parameters

#### N

`N` *extends* `string`

### Parameters

#### config

##### category

[`TokenCategory`](../type-aliases/TokenCategory.md)

##### name

`N`

##### value

`unknown`

Single-value shorthand — derives `axes: []`, `values: {}`, `fallback: value`.

### Returns

`TokenDef`\<`N`, readonly \[\]\>

### Example

```ts
const token = defineToken({
  name: 'bg', category: 'color',
  axes: ['theme', 'contrast'],
  values: { 'normal:light': '#fff', 'normal:dark': '#111' },
  fallback: '#ccc',
});
// token._tag === 'TokenDef'
// token.cssProperty === '--liteship-bg'
```

## Call Signature

> **defineToken**\<`N`, `A`\>(`config`): `TokenDef`\<`N`, `A`\>

Defined in: [core/src/authoring/token.ts:168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/token.ts#L168)

Define a design token — a named design value that varies across axes (theme,
density, contrast, …).

The token is content-addressed via FNV-1a hash of its name, category, axes,
and values. The resulting object is frozen.

`axes` defaults to `['default']` and `fallback` derives from `values.default`
when omitted, so a single-value token is just
`defineToken({ name, category, values: { default: '#ccc' } })`.

Multi-axis value keys join one value per axis with ':' in alphabetical
axis-name order — for `axes: ['theme', 'contrast']` the key order is
`<contrast>:<theme>` (contrast sorts first).

### Type Parameters

#### N

`N` *extends* `string`

#### A

`A` *extends* readonly \[`string`, `string`\] = readonly \[`"default"`\]

### Parameters

#### config

##### axes?

`A`

Default: ['default'] — single-value tokens need no axis declaration.

##### category

[`TokenCategory`](../type-aliases/TokenCategory.md)

##### fallback?

`unknown`

Default: derived from values.default when omitted; omitting both is a validation error.

##### name

`N`

##### values

`Record`\<`string`, `unknown`\>

### Returns

`TokenDef`\<`N`, `A`\>

### Example

```ts
const token = defineToken({
  name: 'bg', category: 'color',
  axes: ['theme', 'contrast'],
  values: { 'normal:light': '#fff', 'normal:dark': '#111' },
  fallback: '#ccc',
});
// token._tag === 'TokenDef'
// token.cssProperty === '--liteship-bg'
```
