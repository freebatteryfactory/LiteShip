[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / evaluate

# Function: evaluate()

> **evaluate**\<`B`\>(`boundary`, `value`, `previousState?`): [`EvaluateResult`](../interfaces/EvaluateResult.md)\<`StateUnion`\<`B`\>\>

Defined in: [quantizer/src/evaluate.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/evaluate.ts#L42)

Find which state a value maps to via the canonical f32-canonical kernel, with
optional hysteresis and crossing detection. Delegates to
[Boundary.evaluateResult](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/boundary-f32.ts) in `@czap/core`.

The explicit signature (over the public `Boundary.Shape`/`StateUnion` types,
not core's internal `BoundaryDef`) keeps the emitted `.d.ts` nameable across
the package boundary while the implementation is a thin delegate.

## Type Parameters

### B

`B` *extends* [`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

## Parameters

### boundary

`B`

### value

`number`

### previousState?

`StateUnion`\<`B`\>

## Returns

[`EvaluateResult`](../interfaces/EvaluateResult.md)\<`StateUnion`\<`B`\>\>
