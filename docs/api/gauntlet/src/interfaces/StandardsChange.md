[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / StandardsChange

# Interface: StandardsChange

Defined in: [gauntlet/src/standards-facts.ts:345](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L345)

A single classified change between the committed snapshot and the live surface.

## Properties

### changeClass

> `readonly` **changeClass**: [`ChangeClass`](../type-aliases/ChangeClass.md)

Defined in: [gauntlet/src/standards-facts.ts:349](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L349)

Strengthen (OK), weaken (blocks unless signed), or neutral.

***

### detail

> `readonly` **detail**: `string`

Defined in: [gauntlet/src/standards-facts.ts:353](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L353)

Human-readable WHY — enough to act on without re-reading the surface.

***

### elementKey

> `readonly` **elementKey**: `string`

Defined in: [gauntlet/src/standards-facts.ts:347](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L347)

The stable key of the element that changed.

***

### weakening?

> `readonly` `optional` **weakening?**: [`WeakeningClass`](../type-aliases/WeakeningClass.md)

Defined in: [gauntlet/src/standards-facts.ts:351](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L351)

For a weaken, the specific weakening class (matched against a sign-off); empty for non-weakens.
