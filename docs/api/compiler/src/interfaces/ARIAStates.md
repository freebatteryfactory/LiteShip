[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / ARIAStates

# Interface: ARIAStates

Defined in: [compiler/src/dispatch.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L47)

ARIA compile input — per-state attribute map plus the currently-active state.

The compiler emits the attributes for `currentState` (not all states) to
avoid flooding the DOM with unused `aria-*` values.

## Properties

### currentState?

> `readonly` `optional` **currentState?**: `string`

Defined in: [compiler/src/dispatch.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L51)

Name of the state whose ARIA attributes should be emitted; defaults to the boundary's first state.

***

### states

> `readonly` **states**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Defined in: [compiler/src/dispatch.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L49)

Per-state ARIA attribute maps keyed by state name.
