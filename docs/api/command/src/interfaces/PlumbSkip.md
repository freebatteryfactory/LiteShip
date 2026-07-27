[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlumbSkip

# Interface: PlumbSkip

Defined in: [command/src/registry.ts:403](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L403)

One skipped generated test — a placeholder standing in for unwired work. A
structural mirror of the host scan's result item, declared here so the
`plumb` command's contract lives in `@liteship/command` without a host import.

## Properties

### file

> `readonly` **file**: `string`

Defined in: [command/src/registry.ts:404](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L404)

***

### kind

> `readonly` **kind**: `string`

Defined in: [command/src/registry.ts:413](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L413)

The detected skip TOKEN as it appears in source — the SAME alias-aware detector the
`no-skipped-test` gate uses (`@liteship/gauntlet`'s `detectSkips`). Covers every form a
generated test can carry: the plain call (`it.skip` / `test.skip` / `describe.skip` /
`bench.skip` / `it.todo` / `xit`), the runtime-conditional (`it.skipIf` / `it.runIf`),
and the bare alias reference (`it.skip` behind a `COND ? it : it.skip` ternary). A
generated test must NEVER skip in ANY form — so all of them are caught here.

***

### message

> `readonly` **message**: `string`

Defined in: [command/src/registry.ts:414](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L414)
