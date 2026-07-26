[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / TokenJSCompiler

# Variable: TokenJSCompiler

> `const` **TokenJSCompiler**: `object`

Defined in: compiler/dist/token-js.d.ts:36

Token JS compiler namespace.

Serializes a token set to a runtime ES module and an ambient `.d.ts`
declaration in parallel so consumers import a single typed object while
the build artifact stays 100% generated.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

Compile a token array into parallel `.ts` source and `.d.ts` declaration.
