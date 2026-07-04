[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / Morph

# Variable: Morph

> `const` **Morph**: `object`

Defined in: [web/src/morph/diff.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/morph/diff.ts#L137)

DOM morph namespace.

[morphWithState](#morphwithstate) is the default entry point — it preserves focus,
scroll, and selection across the morph and validates preserve hints.
Bare [morph](#morph) skips all of that and is only for callers that have
proven they need to.

## Type Declaration

### defaultConfig

> **defaultConfig**: [`MorphConfig`](../interfaces/MorphConfig.md)

Default morph configuration.

### morph

> **morph**: (`oldNode`, `newHTML`, `config?`, `hints?`) => `Effect`\<`void`\>

Morph an existing DOM element to match new HTML using idiomorph-inspired
diffing that minimizes DOM mutations and preserves element identity.

Prefer [morphWithState](#morphwithstate): it is the default entry point. It layers
focus/scroll/selection capture+restore and preserve-constraint validation
on top of this bare morph, and degrades to exactly this behavior when no
config flags or preserve hints apply. Use bare `morph` only when you have
proven you need to skip physical state handling.

#### Parameters

##### oldNode

`Element`

##### newHTML

`string`

##### config?

`Partial`\<[`MorphConfig`](../interfaces/MorphConfig.md)\>

##### hints?

[`MorphHints`](../interfaces/MorphHints.md)

#### Returns

`Effect`\<`void`\>

### morphWithState

> **morphWithState**: (`oldNode`, `newHTML`, `config?`, `hints?`) => `Effect`\<[`MorphResult`](../type-aliases/MorphResult.md)\>

Morph with physical state capture and restore — the default entry point.

Captures focus/scroll/selection before the morph (gated on config flags),
validates preserve hints afterwards (dispatching `czap:morph-rejected` and
`czap:request-snapshot` on violation), and restores physical state. When no
flags or hints apply it degrades to a plain [morph](#morph).

#### Parameters

##### oldNode

`Element`

##### newHTML

`string`

##### config?

`Partial`\<[`MorphConfig`](../interfaces/MorphConfig.md)\>

##### hints?

[`MorphHints`](../interfaces/MorphHints.md)

#### Returns

`Effect`\<[`MorphResult`](../type-aliases/MorphResult.md)\>

### parseHTML

> **parseHTML**: (`html`) => `DocumentFragment`

Parse an HTML string into a DocumentFragment using a template element.

#### Parameters

##### html

`string`

#### Returns

`DocumentFragment`
