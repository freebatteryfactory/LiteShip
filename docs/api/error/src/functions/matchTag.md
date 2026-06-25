[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / matchTag

# Function: matchTag()

> **matchTag**\<`E`, `R`\>(`error`, `handlers`): `R`

Defined in: [error/src/contract.ts:159](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L159)

Exhaustive match over a closed error union. The `handlers` object MUST
supply a branch for every `_tag` in `E` — omit one and it is a compile
error. This is the errors-as-values analogue of an `assertNever` switch:
adding a variant to the union forces every match site to handle it.

## Type Parameters

### E

`E` *extends* [`TaggedError`](../interfaces/TaggedError.md)\<`string`\>

### R

`R`

## Parameters

### error

`E`

### handlers

`{ readonly [K in string]: (error: Extract<E, TaggedError<K>>) => R }`

## Returns

`R`

## Example

```ts
const text = matchTag(err, {
  ParseError: (e) => `bad input from ${e.source}`,
  IoError: (e) => `io failed: ${e.operation}`,
});
```
