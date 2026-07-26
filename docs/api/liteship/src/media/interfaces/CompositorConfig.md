[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / CompositorConfig

# Interface: CompositorConfig

Defined in: core/dist/media/compositor.d.ts:85

Options accepted by `Compositor.create`: pool capacity, optional
frame-budget gating, whether to enable speculative pre-evaluation, and an
optional escalation gate ([getPolicy](#getpolicy) + [runtimeSite](#runtimesite)).

## Properties

### frameBudget?

> `readonly` `optional` **frameBudget?**: `FrameBudgetShape`

Defined in: core/dist/media/compositor.d.ts:87

***

### getPolicy?

> `readonly` `optional` **getPolicy?**: (`projectionName`) => [`PolicyNode`](../../graph/interfaces/PolicyNode.md) \| `undefined`

Defined in: core/dist/media/compositor.d.ts:101

Escalation gate: resolve the [PolicyNode](../../graph/interfaces/PolicyNode.md) (if any) that governs a
projection, keyed by the quantizer's compositor registry name (the same
`name` passed to `add()` — the compositor knows names, not graph projection
ids, so a host wiring graph projections maps id → name here). When a policy applies, the compositor
computes `chooseTier(policy, runtimeSite)` at `add` time and emits ONLY the
targets that tier admits (`admittedTargets`). A projection with NO matching
policy is pass-through (all targets emit). A policy that matches but admits
no tier (the `{ error }` branch — site not admitted, or budgets/grants
exhaust every tier) DENIES every target for that projection: a constraint
that cannot be satisfied must not silently emit at full capability.

#### Parameters

##### projectionName

`string`

#### Returns

[`PolicyNode`](../../graph/interfaces/PolicyNode.md) \| `undefined`

***

### poolCapacity?

> `readonly` `optional` **poolCapacity?**: `number`

Defined in: core/dist/media/compositor.d.ts:86

***

### runtimeSite?

> `readonly` `optional` **runtimeSite?**: [`RuntimeSite`](../../graph/type-aliases/RuntimeSite.md)

Defined in: core/dist/media/compositor.d.ts:107

The runtime site the escalation gate evaluates policies against. Defaults to
an environment hint: `'browser'` when a `window` global is present, else
`'node'`. Ignored unless [getPolicy](#getpolicy) is supplied.

***

### speculative?

> `readonly` `optional` **speculative?**: `boolean`

Defined in: core/dist/media/compositor.d.ts:88
