[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / InvariantViolation

# Interface: InvariantViolation

Defined in: [command/src/registry.ts:398](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L398)

One banned-pattern hit: a repo-relative `file`, 1-based `line`, and the trimmed
source `content`. A structural mirror of the host scan's result item, declared
here so the `check-invariants` command's contract lives in `@czap/command`
without a host import.

## Properties

### content

> `readonly` **content**: `string`

Defined in: [command/src/registry.ts:401](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L401)

***

### file

> `readonly` **file**: `string`

Defined in: [command/src/registry.ts:399](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L399)

***

### line

> `readonly` **line**: `number`

Defined in: [command/src/registry.ts:400](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L400)
