[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / InvariantViolation

# Interface: InvariantViolation

Defined in: [command/src/registry.ts:392](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L392)

One banned-pattern hit: a repo-relative `file`, 1-based `line`, and the trimmed
source `content`. A structural mirror of the host scan's result item, declared
here so the `check-invariants` command's contract lives in `@czap/command`
without a host import.

## Properties

### content

> `readonly` **content**: `string`

Defined in: [command/src/registry.ts:395](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L395)

***

### file

> `readonly` **file**: `string`

Defined in: [command/src/registry.ts:393](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L393)

***

### line

> `readonly` **line**: `number`

Defined in: [command/src/registry.ts:394](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L394)
