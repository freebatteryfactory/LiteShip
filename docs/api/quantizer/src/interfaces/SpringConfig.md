[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / SpringConfig

# Interface: SpringConfig

Defined in: [quantizer/src/quantizer.ts:155](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L155)

Spring physics parameters for CSS easing auto-generation.

When a [QuantizerConfig](QuantizerConfig.md) carries a spring, its CSS outputs receive an
injected `--liteship-easing` custom property derived via `Easing.springToLinearCSS`
so native `linear()` timing matches the physical spring response.

## Properties

### damping

> `readonly` **damping**: `number`

Defined in: [quantizer/src/quantizer.ts:159](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L159)

Damping coefficient; higher = less oscillation.

***

### mass?

> `readonly` `optional` **mass?**: `number`

Defined in: [quantizer/src/quantizer.ts:161](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L161)

Mass of the animated body; defaults to `1`.

***

### stiffness

> `readonly` **stiffness**: `number`

Defined in: [quantizer/src/quantizer.ts:157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L157)

Spring constant (force per unit displacement); higher = snappier.
