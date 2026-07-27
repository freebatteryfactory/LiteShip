[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / annotatedArbitrary

# Function: annotatedArbitrary()

> **annotatedArbitrary**(`node`): ((`fc`) => `unknown`) \| `undefined`

Defined in: core/dist/schema/ast.d.ts:190

Read the [ArbitraryAnnotationId](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/ast.ts) thunk off a node, or `undefined` when
absent. The thunk takes `fast-check` (supplied by the harness realizing it) so
the kernel never imports the property-testing engine.

## Parameters

### node

[`SchemaNode`](../type-aliases/SchemaNode.md)

## Returns

((`fc`) => `unknown`) \| `undefined`
