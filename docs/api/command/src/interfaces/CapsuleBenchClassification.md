[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleBenchClassification

# Interface: CapsuleBenchClassification

Defined in: [command/src/registry.ts:326](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L326)

Bench-honesty classification across a capsule corpus — a structural mirror of
the gate engine's result, declared here so the `capsule-verify` command's
contract lives in `@czap/command` without a host import. `real` counts genuine
measurements AND typed not-applicable benches (a premise-guard body); every
name in `placeholder` is a comment-only bench measuring nothing (the bench
analogue of `it.skip` — green but covering nothing).

## Properties

### placeholder

> `readonly` **placeholder**: readonly `string`[]

Defined in: [command/src/registry.ts:332](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L332)

Capsule names whose bench closure is empty/comment-only (no measurement).

***

### real

> `readonly` **real**: `number`

Defined in: [command/src/registry.ts:330](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L330)

Benches with executable closure bodies — actually measuring something.

***

### total

> `readonly` **total**: `number`

Defined in: [command/src/registry.ts:328](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L328)

Number of generated bench files found.
