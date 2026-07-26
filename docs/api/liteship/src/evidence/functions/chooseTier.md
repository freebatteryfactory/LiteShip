[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / chooseTier

# Function: chooseTier()

> **chooseTier**(`policy`, `runtimeSite`): [`EscalationResult`](../type-aliases/EscalationResult.md)

Defined in: core/dist/evidence/escalation.d.ts:60

Choose the minimal capability tier a [PolicyNode](../../graph/interfaces/PolicyNode.md) admits on a runtime site.

Returns `{ tier, admittedTargets }` on success, or `{ error }` if the site is
not in `policy.sites` or no tier at or below `policy.requires` clears the
budgets/grants. Memoized by `policy.id + runtimeSite` (a policy id is its
`fnv1a` content address, so equal inputs return a stable reference).

## Parameters

### policy

[`PolicyNode`](../../graph/interfaces/PolicyNode.md)

The capability/constraint gate to read.

### runtimeSite

[`RuntimeSite`](../../graph/type-aliases/RuntimeSite.md)

The site the gated node will be admitted on.

## Returns

[`EscalationResult`](../type-aliases/EscalationResult.md)
