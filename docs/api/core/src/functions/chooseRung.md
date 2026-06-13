[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / chooseRung

# Function: chooseRung()

> **chooseRung**(`policy`, `runtimeSite`): [`EscalationResult`](../type-aliases/EscalationResult.md)

Defined in: [core/src/escalation.ts:126](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/escalation.ts#L126)

Choose the minimal capability rung a [PolicyNode](../interfaces/PolicyNode.md) admits on a runtime site.

Returns `{ rung, admittedTargets }` on success, or `{ error }` if the site is
not in `policy.sites` or no rung at or below `policy.requires` clears the
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
