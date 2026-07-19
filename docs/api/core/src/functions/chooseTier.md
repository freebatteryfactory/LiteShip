[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / chooseTier

# Function: chooseTier()

> **chooseTier**(`policy`, `runtimeSite`): [`EscalationResult`](../type-aliases/EscalationResult.md)

Defined in: [core/src/escalation.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/escalation.ts#L141)

Choose the minimal capability tier a [PolicyNode](../interfaces/PolicyNode.md) admits on a runtime site.

Returns `{ tier, admittedTargets }` on success, or `{ error }` if the site is
not in `policy.sites` or no tier at or below `policy.requires` clears the
budgets/grants. Memoized by `policy.id + runtimeSite` (a policy id is its
`fnv1a` content address, so equal inputs return a stable reference).

## Parameters

### policy

[`PolicyNode`](../interfaces/PolicyNode.md)

The capability/constraint gate to read.

### runtimeSite

[`RuntimeSite`](../type-aliases/RuntimeSite.md)

The site the gated node will be admitted on.

## Returns

[`EscalationResult`](../type-aliases/EscalationResult.md)
