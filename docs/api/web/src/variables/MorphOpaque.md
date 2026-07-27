[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / MorphOpaque

# Variable: MorphOpaque

> `const` **MorphOpaque**: `object`

Defined in: [web/src/morph/opaque.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/morph/opaque.ts#L25)

Namespace bundle for the morph-opaque marker (house pattern, like `SemanticId`).

## Type Declaration

### ATTR

> **ATTR**: `"data-liteship-morph-opaque"`

Morph-opaque subtrees — structural isolation for self-owned islands.

An element marked `data-liteship-morph-opaque` is OWNED BY THE CLIENT (CodeMirror, a canvas,
a chart lib): the morph engine never syncs its attributes, never descends into its
children, and never removes it — even when the server HTML omits it entirely. The
attribute is presence-based (any value). Sanitization is NOT skipped: new opaque content
arriving via morph still passes the `sanitized-html` policy at parse time — opacity
exempts a subtree from DIFFING, never from the trust boundary.

### containsOpaque

> **containsOpaque**: (`el`) => `boolean`

True when `el`'s SUBTREE (excluding `el` itself) contains an opaque element. The removal
path uses this to extend L2 to ancestors: removing a container would cascade-destroy the
island inside it, so the container is preserved along with the island.

#### Parameters

##### el

`Element`

#### Returns

`boolean`

### isOpaque

> **isOpaque**: (`node`) => `node is Element`

True when `node` is an Element carrying the opaque marker.

#### Parameters

##### node

`Node`

#### Returns

`node is Element`
