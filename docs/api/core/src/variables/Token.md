[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Token

# Variable: Token

> `const` **Token**: `object`

Defined in: [core/src/authoring/token.ts:280](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/token.ts#L280)

Token — the resolution namespace for a Token definition. Construction
lives in the standalone [defineToken](../functions/defineToken.md); this object carries
[Token.tap](#tap) (resolve a value for given axis values) and
[Token.cssVar](#cssvar) (the `var(--liteship-<name>)` reference).

## Type Declaration

### cssVar

> **cssVar**: \<`N`\>(`token`) => `` `var(--liteship-${N})` `` = `_cssVar`

Generate a CSS var() reference for a token.

Returns a `var(--liteship-<name>)` string suitable for use in CSS properties.

#### Type Parameters

##### N

`N` *extends* `string`

#### Parameters

##### token

`TokenDef`\<`N`\>

#### Returns

`` `var(--liteship-${N})` ``

#### Example

```ts
const token = defineToken({
  name: 'primary', category: 'color',
  axes: ['theme'],
  values: { 'light': '#000' },
  fallback: '#888',
});
const ref = Token.cssVar(token);
// ref === 'var(--liteship-primary)'
```

### tap

> **tap**: \<`T`\>(`token`, `axisValues`) => `T` = `_tap`

Resolve a token's value for the given axis values. Builds a sorted lookup key.

Axes are sorted alphabetically and joined with ':' to form the lookup key.
Falls back to the token's fallback value if no match is found.

The optional type parameter `T` lets callers narrow the return value when
they know the value shape; without it, the return is `unknown` (the
underlying `TokenDef.values` is `Record<string, unknown>` because token
values can be any JSON shape — colors as strings, spacing as numbers,
shadow records as objects). Pass `Token.tap<string>(...)` for a color
token, etc.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### token

`TokenDef`

##### axisValues

`Record`\<`string`, `string`\>

#### Returns

`T`

#### Example

```ts
const token = defineToken({
  name: 'primary', category: 'color',
  axes: ['theme'],
  values: { 'light': '#000', 'dark': '#fff' },
  fallback: '#888',
});
const value = Token.tap<string>(token, { theme: 'dark' });
// value === '#fff' (typed as string)
```
