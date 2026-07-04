[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / MorphOpaque

# Variable: MorphOpaque

> `const` **MorphOpaque**: `object`

Defined in: [web/src/morph/opaque.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/morph/opaque.ts#L18)

Namespace bundle for the morph-opaque marker (house pattern, like `SemanticId`).

## Type Declaration

### ATTR

> **ATTR**: `"data-czap-morph-opaque"`

Morph-opaque subtrees — structural isolation for self-owned islands.

An element marked `data-czap-morph-opaque` is OWNED BY THE CLIENT (CodeMirror, a canvas,
a chart lib): the morph engine never syncs its attributes, never descends into its
children, and never removes it — even when the server HTML omits it entirely. The
attribute is presence-based (any value). Sanitization is NOT skipped: new opaque content
arriving via morph still passes the `sanitized-html` policy at parse time — opacity
exempts a subtree from DIFFING, never from the trust boundary.

### isOpaque

> **isOpaque**: (`node`) => `node is Element`

True when `node` is an Element carrying the opaque marker.

#### Parameters

##### node

`Node`

#### Returns

`node is Element`
