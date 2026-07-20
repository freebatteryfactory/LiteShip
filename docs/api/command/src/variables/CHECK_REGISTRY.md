[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CHECK\_REGISTRY

# Variable: CHECK\_REGISTRY

> `const` **CHECK\_REGISTRY**: readonly [`CheckDefinition`](../interfaces/CheckDefinition.md)[]

Defined in: [command/src/checks/registry.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/registry.ts#L31)

The canonical check set, in declared plan order. Each `command` is the exact
root `package.json` script line; each `id` is `check/<slug>`. See
[CheckDefinition](../interfaces/CheckDefinition.md) for the field contract.
