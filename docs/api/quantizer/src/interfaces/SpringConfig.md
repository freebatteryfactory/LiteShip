[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / SpringConfig

# Interface: SpringConfig

Defined in: [quantizer/src/quantizer.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L130)

Spring physics parameters for CSS easing auto-generation.

When a [QuantizerConfig](QuantizerConfig.md) carries a spring, its CSS outputs receive an
injected `--liteship-easing` custom property derived via `Easing.springToLinearCSS`
so native `linear()` timing matches the physical spring response.

## Properties

### damping

> `readonly` **damping**: `number`

Defined in: [quantizer/src/quantizer.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L134)

Damping coefficient; higher = less oscillation.

***

### mass?

> `readonly` `optional` **mass?**: `number`

Defined in: [quantizer/src/quantizer.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L136)

Mass of the animated body; defaults to `1`.

***

### stiffness

> `readonly` **stiffness**: `number`

Defined in: [quantizer/src/quantizer.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L132)

Spring constant (force per unit displacement); higher = snappier.
