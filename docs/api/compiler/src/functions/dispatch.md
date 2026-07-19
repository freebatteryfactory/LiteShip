[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / dispatch

# Function: dispatch()

> **dispatch**(`def`): [`CompileResult`](../type-aliases/CompileResult.md)

Defined in: [compiler/src/dispatch.ts:159](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L159)

Dispatch a [CompilerDef](../type-aliases/CompilerDef.md) to the matching compiler and return a
tagged [CompileResult](../type-aliases/CompileResult.md).

This is the single public entry point for multi-target compilation.
The switch ends in an `assertNever` exhaustiveness guard; adding a new arm
to [CompilerDef](../type-aliases/CompilerDef.md) without a matching case produces a type error here.

## Parameters

### def

[`CompilerDef`](../type-aliases/CompilerDef.md)

The compiler definition arm to dispatch

## Returns

[`CompileResult`](../type-aliases/CompileResult.md)

A [CompileResult](../type-aliases/CompileResult.md) tagged by target

## Example

```ts
import { Boundary } from '@liteship/core';
import { dispatch } from '@liteship/compiler';

const boundary = Boundary.make({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});
const result = dispatch({
  _tag: 'CSSCompiler',
  boundary,
  states: { sm: { 'font-size': '14px' }, lg: { 'font-size': '18px' } },
});
if (result.target === 'css') {
  console.log(result.result.raw); // emitted @container rules
}
```
