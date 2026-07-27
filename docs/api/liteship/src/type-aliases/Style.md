[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [liteship/src](../README.md) / Style

# Type Alias: Style

> **Style** = `object`

Defined in: core/dist/authoring/style.d.ts:137

Style — the resolution namespace for a Style definition. Construction
lives in the standalone [defineStyle](../functions/defineStyle.md); this object carries
[Style.tap](#tap) (resolve a style to a flat property map for a state) and
[Style.mergeLayers](#mergelayers) (deep-merge two style layers).

## Properties

### mergeLayers

> **mergeLayers**: (`base`, `override`) => `StyleLayer`

Defined in: core/dist/authoring/style.d.ts:139

Deep merge two style layers: properties spread, pseudo merge per selector, boxShadow concat.

Override properties win over base. Pseudo-element selectors are merged per
key. Box shadows are concatenated (base first, then override).

#### Parameters

##### base

`StyleLayer`

##### override

`StyleLayer`

#### Returns

`StyleLayer`

#### Example

```ts
const base = { properties: { color: 'red', padding: '4px' } };
const override = { properties: { color: 'blue', margin: '8px' } };
const merged = Style.mergeLayers(base, override);
// merged.properties === { color: 'blue', padding: '4px', margin: '8px' }
```

***

### tap

> **tap**: (`style`, `state?`) => `Record`\<`string`, `string`\>

Defined in: core/dist/authoring/style.d.ts:138

Resolve a style to a flat `Record<string, string>` for the given state.

Merges base layer with the state-specific override (if any), flattens
pseudo selectors and box-shadow into the result map.

#### Parameters

##### style

`StyleDef`

##### state?

`string`

#### Returns

`Record`\<`string`, `string`\>

#### Example

```ts
const style = defineStyle({
  base: { properties: { color: 'black' } },
  states: { dark: { properties: { color: 'white' } } },
});
const props = Style.tap(style, 'dark');
// props === { color: 'white' }
const baseProps = Style.tap(style);
// baseProps === { color: 'black' }
```
