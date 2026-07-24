[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / SpringConfig

# Interface: SpringConfig

Defined in: [quantizer/src/quantizer.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L156)

Spring physics parameters for CSS easing auto-generation.

When a [QuantizerConfig](QuantizerConfig.md) carries a spring, its CSS outputs receive an
injected `--liteship-easing` custom property derived via `Easing.springToLinearCSS`
so native `linear()` timing matches the physical spring response.

## Properties

### damping

> `readonly` **damping**: `number`

Defined in: [quantizer/src/quantizer.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L160)

Damping coefficient; higher = less oscillation.

***

### mass?

> `readonly` `optional` **mass?**: `number`

Defined in: [quantizer/src/quantizer.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L162)

Mass of the animated body; defaults to `1`.

***

### stiffness

> `readonly` **stiffness**: `number`

Defined in: [quantizer/src/quantizer.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L158)

Spring constant (force per unit displacement); higher = snappier.
