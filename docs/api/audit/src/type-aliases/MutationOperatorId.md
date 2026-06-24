[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / MutationOperatorId

# Type Alias: MutationOperatorId

> **MutationOperatorId** = `"conditional-boundary"` \| `"equality"` \| `"arithmetic"` \| `"logical"` \| `"boolean-literal"` \| `"return-value"` \| `"unary-not"` \| `"string-literal"`

Defined in: [audit/src/mutation-engine.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L77)

The closed set of mutation OPERATOR ids — a `_tag` union (composition, not
inheritance). Each id names a single, documented, behaviour-changing rewrite the
catalogue applies. The list is FOCUSED but real (the classic mutation-testing
operator families, restricted to the ones whose mutation is unambiguous on the TS
AST and never produces a syntactically-invalid program):

- `conditional-boundary` — flips a relational operator across its boundary
  (`<`↔`<=`, `>`↔`>=`). Catches an off-by-one a `>` vs `>=` test would pin.
- `equality` — flips an equality operator to its negation (`===`↔`!==`,
  `==`↔`!=`). Catches a test that never exercises the false branch.
- `arithmetic` — flips an arithmetic operator within its inverse pair
  (`+`↔`-`, `*`↔`/`). Catches a value-blind test (`typeof x === 'number'`).
- `logical` — flips a short-circuit connective (`&&`↔`||`). Catches a test that
  never drives both operands.
- `boolean-literal` — flips a boolean literal (`true`↔`false`). Catches a
  constant a test never asserts on.
- `return-value` — replaces a non-void `return <expr>` with a canonical
  DIFFERENT value (a typed sentinel: `return 0` for a numeric return, `return
  null` otherwise — chosen structurally, never randomly). Catches a test that
  ignores the return value.
- `unary-not` — strips a logical-NOT (`!x`→`x`). Catches a test that never
  exercises the negated condition.
- `string-literal` — replaces a non-empty string literal with the empty string.
  Catches a test that never asserts the string's content.
