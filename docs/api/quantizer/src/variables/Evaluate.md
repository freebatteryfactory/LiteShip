[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / Evaluate

# Variable: Evaluate

> `const` **Evaluate**: `object`

Defined in: [quantizer/src/evaluate.ts:53](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/evaluate.ts#L53)

Boundary evaluation namespace. `Evaluate.evaluate` is the [evaluate](../functions/evaluate.md) delegate.

## Type Declaration

### evaluate

> **evaluate**: \<`B`\>(`boundary`, `value`, `previousState?`) => [`EvaluateResult`](../interfaces/EvaluateResult.md)\<`StateUnion`\<`B`\>\>

Find which state a value maps to via the canonical f32-canonical kernel, with
optional hysteresis and crossing detection. Delegates to
Boundary.evaluateResult in `@czap/core`.

The explicit signature (over the public `Boundary.Shape`/`StateUnion` types,
not core's internal `BoundaryDef`) keeps the emitted `.d.ts` nameable across
the package boundary while the implementation is a thin delegate.

#### Type Parameters

##### B

`B` *extends* [`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### boundary

`B`

##### value

`number`

##### previousState?

`StateUnion`\<`B`\>

#### Returns

[`EvaluateResult`](../interfaces/EvaluateResult.md)\<`StateUnion`\<`B`\>\>
