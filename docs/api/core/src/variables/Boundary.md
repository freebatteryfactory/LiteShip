[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Boundary

# Variable: Boundary

> `const` **Boundary**: `object`

Defined in: [core/src/authoring/boundary.ts:374](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/boundary.ts#L374)

Boundary — the evaluation namespace for a Boundary definition.

Construction lives in the standalone [defineBoundary](../functions/defineBoundary.md); this object
carries the pure evaluation faces: [Boundary.evaluate](#evaluate) (cheap state
lookup), [Boundary.evaluateResult](#evaluateresult) (rich `{state, index, value, crossed}`
+ hysteresis), [Boundary.evaluateBatch](#evaluatebatch) (WASM-accelerated bulk),
[Boundary.evaluateWithHysteresis](#evaluatewithhysteresis), and [Boundary.isActive](#isactive) (spec
gating).

## Type Declaration

### evaluate

> **evaluate**: \<`B`\>(`boundary`, `value`) => `B`\[`"states"`\]\[`number`\] = `_evaluate`

Evaluate which state a value falls into given a boundary.

The cheap face of evaluation: returns just the resolved state name via the
single f32-canonical [rawIndexF32](../functions/rawIndexF32.md) kernel (no hysteresis, no crossing
detection). For the rich `{state, index, value, crossed}` result — and for
hysteresis — use [\_evaluateResult](#evaluateresult).

#### Type Parameters

##### B

`B` *extends* `BoundaryDef`\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### boundary

`B`

##### value

`number`

#### Returns

`B`\[`"states"`\]\[`number`\]

#### Example

```ts
const bp = defineBoundary({ input: 'viewport.width', at: [[0, 'sm'], [768, 'md'], [1024, 'lg']] });
const state = Boundary.evaluate(bp, 800);
// state === 'md'
```

### evaluateBatch

> **evaluateBatch**: \<`B`\>(`boundary`, `values`) => `Uint32Array` = `_evaluateBatch`

Batch-evaluate many values against ONE boundary into their raw state
indices — the `i` such that `boundary.states[i]` is the state for that value.

This is the WASM-accelerated face of [\_evaluate](#evaluate). It routes through
`WASMDispatch.kernels().batchBoundaryEval`: the Rust `liteship-compute` kernel
once [WASMDispatch.load](../interfaces/WASMDispatchAPI.md#load) has run, the pure-TS `fallbackKernels`
otherwise. BOTH select the identical index — the fallback IS the
[rawIndexF32](../functions/rawIndexF32.md) loop and the WASM kernel is locked to it by the
wasm-parity property suite — so the output is bit-identical to mapping
[\_evaluate](#evaluate) over `values`, loaded or not. The win is throughput on
large value sets (offline frame precompute, scrub timelines, per-entity
scene signals), never different numbers.

Stateless raw selection, like [\_evaluate](#evaluate) (no hysteresis). Map indices
to state names with `boundary.states[i]` when you need them.

#### Type Parameters

##### B

`B` *extends* `BoundaryDef`\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### boundary

`B`

##### values

`ArrayLike`\<`number`\>

#### Returns

`Uint32Array`

#### Example

```ts
const bp = defineBoundary({ input: 'scroll', at: [[0, 'top'], [500, 'mid'], [1500, 'deep']] });
const idx = Boundary.evaluateBatch(bp, [120, 800, 2000]);
// idx → Uint32Array [0, 1, 2]; bp.states[idx[1]] === 'mid'
```

### evaluateResult

> **evaluateResult**: \<`B`\>(`boundary`, `value`, `previousState?`) => [`EvaluateResult`](../interfaces/EvaluateResult.md)\<`B`\[`"states"`\]\[`number`\]\> = `_evaluateResult`

Evaluate a value against a boundary into the rich [EvaluateResult](../interfaces/EvaluateResult.md)
`{ state, index, value, crossed }`.

This is the canonical home of `index` + `crossed` (consumed by the quantizer
and, downstream, by Stage pose-lowering). It is also the single hysteresis
implementation: `evaluateWithHysteresis` is its string projection.

Raw state selection uses the f32-canonical [rawIndexF32](../functions/rawIndexF32.md) kernel; the
half-width dead-zone refinement (when a `previousState` and `hysteresis` are
supplied) compares in f64 against the un-rounded thresholds, matching the
prior `evaluateWithHysteresis` and quantizer semantics exactly.

#### Type Parameters

##### B

`B` *extends* `BoundaryDef`\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### boundary

`B`

##### value

`number`

##### previousState?

`B`\[`"states"`\]\[`number`\]

#### Returns

[`EvaluateResult`](../interfaces/EvaluateResult.md)\<`B`\[`"states"`\]\[`number`\]\>

### evaluateWithHysteresis

> **evaluateWithHysteresis**: \<`B`\>(`boundary`, `value`, `previousState`) => `B`\[`"states"`\]\[`number`\] = `_evaluateWithHysteresis`

Evaluate with hysteresis (requires previous state). Half-width dead zone algorithm.

Prevents flickering at boundary edges by requiring the value to cross
beyond a dead zone (half the hysteresis width) before transitioning states.

#### Type Parameters

##### B

`B` *extends* `BoundaryDef`\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### boundary

`B`

##### value

`number`

##### previousState

`B`\[`"states"`\]\[`number`\]

#### Returns

`B`\[`"states"`\]\[`number`\]

#### Example

```ts
const bp = defineBoundary({ input: 'viewport.width', at: [[0, 'sm'], [768, 'md']], hysteresis: 20 });
const state1 = Boundary.evaluateWithHysteresis(bp, 770, 'sm');
// state1 === 'sm' (within dead zone, stays at previous)
const state2 = Boundary.evaluateWithHysteresis(bp, 780, 'sm');
// state2 === 'md' (past dead zone, transitions)
```

### isActive

> **isActive**: \<`B`\>(`boundary`, `context?`) => `boolean` = `_isActive`

Check whether a boundary is active given its optional spec and current context.
Returns true if the boundary has no spec or the spec allows evaluation.

#### Type Parameters

##### B

`B` *extends* `BoundaryDef`\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### boundary

`B`

##### context?

###### activeExperiments?

readonly `string`[]

###### capabilities?

`Record`\<`string`, `unknown`\>

###### nowMs?

`number`

#### Returns

`boolean`
