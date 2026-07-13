[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / MotionCompiler

# Variable: MotionCompiler

> `const` **MotionCompiler**: `object`

Defined in: [compiler/src/motion.ts:309](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L309)

Native-CSS motion compiler namespace.

Compiles a `CssMotionPlan` into `@property` registrations, `@keyframes`,
`@starting-style`, state-keyed transitions, and an optional `@supports`-gated
scroll/view timeline path with spring easing via `Easing.springToLinearCSS`.

## Type Declaration

### compile

> **compile**: (`input`) => [`MotionCompileResult`](../interfaces/MotionCompileResult.md)

#### Parameters

##### input

[`MotionCompileInput`](../interfaces/MotionCompileInput.md)

#### Returns

[`MotionCompileResult`](../interfaces/MotionCompileResult.md)
