[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / TokenJSCompiler

# Variable: TokenJSCompiler

> `const` **TokenJSCompiler**: `object`

Defined in: [compiler/src/token-js.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/token-js.ts#L102)

Token JS compiler namespace.

Serializes a token set to a runtime ES module and an ambient `.d.ts`
declaration in parallel so consumers import a single typed object while
the build artifact stays 100% generated.

## Type Declaration

### compile

> **compile**: (`tokens`) => [`TokenJSResult`](../interfaces/TokenJSResult.md)

Compile a token array into parallel `.ts` source and `.d.ts` declaration.

Compile a list of [Token](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Token.md) into a JS object + companion type
declaration, grouped by category.

#### Parameters

##### tokens

readonly [`Token`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Token.md)[]

#### Returns

[`TokenJSResult`](../interfaces/TokenJSResult.md)
