[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / StandardsChange

# Interface: StandardsChange

Defined in: [gauntlet/src/facts/standards-facts.ts:366](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L366)

A single classified change between the committed snapshot and the live surface.

## Properties

### changeClass

> `readonly` **changeClass**: [`ChangeClass`](../type-aliases/ChangeClass.md)

Defined in: [gauntlet/src/facts/standards-facts.ts:370](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L370)

Strengthen (OK), weaken (blocks unless signed), or neutral.

***

### detail

> `readonly` **detail**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:374](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L374)

Human-readable WHY — enough to act on without re-reading the surface.

***

### elementKey

> `readonly` **elementKey**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:368](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L368)

The stable key of the element that changed.

***

### weakening?

> `readonly` `optional` **weakening?**: [`WeakeningClass`](../type-aliases/WeakeningClass.md)

Defined in: [gauntlet/src/facts/standards-facts.ts:372](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L372)

For a weaken, the specific weakening class (matched against a sign-off); empty for non-weakens.
