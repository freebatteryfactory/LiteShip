[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / assertNever

# Function: assertNever()

> **assertNever**(`value`, `context?`): `never`

Defined in: [error/src/variants.ts:295](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L295)

Exhaustiveness guard for `switch` statements over a closed union — the
statement-level twin of [matchTag](matchTag.md). Put it in the `default:` branch:
if every case is handled, the scrutinee is `never` and this compiles; add a
variant without a matching case and it becomes a COMPILE error. The one
shared replacement for the hand-rolled `const _x: never = value` idiom.

At runtime — reached only when a value outside the static type slips in (bad
external data the types claimed impossible) — it throws an
[InvariantViolationError](../variables/InvariantViolationError.md), since reaching it means a contract the type
system guaranteed was broken.

## Parameters

### value

`never`

### context?

`string` = `'exhaustiveness'`

## Returns

`never`

## Example

```ts
switch (node._tag) {
  case 'A': return handleA(node);
  case 'B': return handleB(node);
  default: return assertNever(node, 'node._tag');
}
```
