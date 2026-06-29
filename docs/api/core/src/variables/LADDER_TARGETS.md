[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LADDER\_TARGETS

# Variable: LADDER\_TARGETS

> `const` **LADDER\_TARGETS**: readonly `ReadonlyArray`\<[`LadderTarget`](../type-aliases/LadderTarget.md)\>[]

Defined in: [core/src/cap-ladder.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cap-ladder.ts#L42)

The admissible targets at each of the 5 ladder rungs, lowest (index 0) to
highest (index 4). Each rung is a NON-STRICT superset of the one below
(index 1 == index 2 admit the same targets — `css` arrives at index 1 and
`glsl` not until index 3), so the ladder is monotone but not strictly
increasing.

Frozen at the rung level so a consumer cannot mutate the shared source. The
projections below copy each rung into a fresh `Set` keyed by their own
vocabulary, so callers always get an isolated, mutation-safe value.
