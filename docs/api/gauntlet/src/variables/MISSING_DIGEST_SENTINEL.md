[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / MISSING\_DIGEST\_SENTINEL

# Variable: MISSING\_DIGEST\_SENTINEL

> `const` **MISSING\_DIGEST\_SENTINEL**: `"missing:not-in-ir"`

Defined in: [gauntlet/src/verdict-cache.ts:192](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L192)

The inert sentinel folded in for a covered file ABSENT from the IR. By design
NOT a real content address (it carries the `missing:` scheme + a NUL-free
marker) so it can never collide with a real blake3 `AddressedDigest` display
string — an uncovered file is content-keyed as "absent", never as some real
digest that a later present-and-changed version might coincidentally match.
