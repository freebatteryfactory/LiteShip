[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / InvariantViolation

# Interface: InvariantViolation

Defined in: [command/src/registry.ts:441](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L441)

One banned-pattern hit: a repo-relative `file`, 1-based `line`, and the trimmed
source `content`. A structural mirror of the host scan's result item, declared
here so the `check-invariants` command's contract lives in `@liteship/command`
without a host import.

## Properties

### content

> `readonly` **content**: `string`

Defined in: [command/src/registry.ts:444](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L444)

***

### file

> `readonly` **file**: `string`

Defined in: [command/src/registry.ts:442](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L442)

***

### line

> `readonly` **line**: `number`

Defined in: [command/src/registry.ts:443](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L443)
