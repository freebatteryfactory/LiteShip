[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CzapValidationError

# Class: CzapValidationError

Defined in: [core/src/validation-error.ts:19](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validation-error.ts#L19)

Structured validation error thrown by czap factory/constructor functions
and runtime precondition checks (e.g. capacity or call-order violations).

Carries a `module` identifier (e.g. `'Boundary.make'`) and a human-readable
`detail` message. Synchronous factories throw this directly so callers can
`catch` and branch via [isValidationError](../functions/isValidationError.md) without Effect plumbing.

## Extends

- `Error`

## Constructors

### Constructor

> **new CzapValidationError**(`module`, `detail`): `CzapValidationError`

Defined in: [core/src/validation-error.ts:24](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validation-error.ts#L24)

#### Parameters

##### module

`string`

##### detail

`string`

#### Returns

`CzapValidationError`

#### Overrides

`Error.constructor`

## Properties

### \_tag

> `readonly` **\_tag**: `"CzapValidationError"`

Defined in: [core/src/validation-error.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validation-error.ts#L20)

***

### detail

> `readonly` **detail**: `string`

Defined in: [core/src/validation-error.ts:22](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validation-error.ts#L22)

***

### module

> `readonly` **module**: `string`

Defined in: [core/src/validation-error.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validation-error.ts#L21)
