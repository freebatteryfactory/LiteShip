[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / taggedError

# Function: taggedError()

> **taggedError**\<`Tag`, `Fields`\>(`tag`, `message`, `fields`, `options?`): [`TaggedErrorValue`](../type-aliases/TaggedErrorValue.md)\<`Tag`, `Fields`\>

Defined in: [error/src/contract.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L65)

The one composer. Builds a tagged error by composing `_tag` + structured
`fields` onto a fresh platform `Error` (so the result has a stack trace and
is `instanceof Error`) — without ever subclassing `Error`.

Pass `options.cause` to chain an underlying error through the platform-
standard `Error.cause` — so wrapping a caught OS/library error preserves it
(`error.cause`) on any variant, without each variant declaring a field.

## Type Parameters

### Tag

`Tag` *extends* `string`

### Fields

`Fields` *extends* `object`

## Parameters

### tag

`Tag`

### message

`string`

### fields

`Fields`

### options?

#### cause?

`unknown`

## Returns

[`TaggedErrorValue`](../type-aliases/TaggedErrorValue.md)\<`Tag`, `Fields`\>

## Example

```ts
interface ParseError extends TaggedError<'ParseError'> {
  readonly source: string;
  readonly detail: string;
}
const ParseError = (source: string, detail: string): ParseError =>
  taggedError('ParseError', `${source}: ${detail}`, { source, detail });

// chaining a lower-level failure:
try { readFileSync(p); } catch (cause) {
  throw taggedError('IoError', `read ${p}`, { operation: 'readFile' }, { cause });
}
```
