[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CompositorConfig

# Interface: CompositorConfig

Defined in: [core/src/compositor.ts:90](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/compositor.ts#L90)

Options accepted by `Compositor.create`: pool capacity, optional
frame-budget gating, whether to enable speculative pre-evaluation, and an
optional escalation gate ([getPolicy](#getpolicy) + [runtimeSite](#runtimesite)).

## Properties

### frameBudget?

> `readonly` `optional` **frameBudget?**: `FrameBudgetShape`

Defined in: [core/src/compositor.ts:92](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/compositor.ts#L92)

***

### getPolicy?

> `readonly` `optional` **getPolicy?**: (`projectionName`) => [`PolicyNode`](PolicyNode.md) \| `undefined`

Defined in: [core/src/compositor.ts:106](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/compositor.ts#L106)

Escalation gate: resolve the [PolicyNode](PolicyNode.md) (if any) that governs a
projection, keyed by the quantizer's compositor registry name (the same
`name` passed to `add()` — the compositor knows names, not graph projection
ids, so a host wiring graph projections maps id → name here). When a policy applies, the compositor
computes `chooseRung(policy, runtimeSite)` at `add` time and emits ONLY the
targets that rung admits (`admittedTargets`). A projection with NO matching
policy is pass-through (all targets emit). A policy that matches but admits
no rung (the `{ error }` branch — site not admitted, or budgets/grants
exhaust every rung) DENIES every target for that projection: a constraint
that cannot be satisfied must not silently emit at full capability.

#### Parameters

##### projectionName

`string`

#### Returns

[`PolicyNode`](PolicyNode.md) \| `undefined`

***

### poolCapacity?

> `readonly` `optional` **poolCapacity?**: `number`

Defined in: [core/src/compositor.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/compositor.ts#L91)

***

### runtimeSite?

> `readonly` `optional` **runtimeSite?**: [`RuntimeSite`](../type-aliases/RuntimeSite.md)

Defined in: [core/src/compositor.ts:112](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/compositor.ts#L112)

The runtime site the escalation gate evaluates policies against. Defaults to
an environment hint: `'browser'` when a `window` global is present, else
`'node'`. Ignored unless [getPolicy](#getpolicy) is supplied.

***

### speculative?

> `readonly` `optional` **speculative?**: `boolean`

Defined in: [core/src/compositor.ts:93](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/compositor.ts#L93)
