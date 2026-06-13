[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / ARIAStates

# Interface: ARIAStates

Defined in: [compiler/src/dispatch.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L41)

ARIA compile input — per-state attribute map plus the currently-active state.

The compiler emits the attributes for `currentState` (not all states) to
avoid flooding the DOM with unused `aria-*` values.

## Properties

### currentState?

> `readonly` `optional` **currentState?**: `string`

Defined in: [compiler/src/dispatch.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L45)

Name of the state whose ARIA attributes should be emitted; defaults to the boundary's first state.

***

### states

> `readonly` **states**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Defined in: [compiler/src/dispatch.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L43)

Per-state ARIA attribute maps keyed by state name.
