[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / unwrapValidated

# Function: unwrapValidated()

> **unwrapValidated**\<`T`\>(`proposal`): `T`

Defined in: [core/src/validated-output.ts:199](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L199)

RESOLVED (open question #1 — the generated-UI apply seam). The graph-patch
target has a host-authorized framework step (`AICast.applyValidatedPatch`): the
framework owns the re-addressing kernel, so it exposes (never invokes) apply.
The generated-UI target has NO such framework step — rendering belongs to the
host's renderer, and core stays renderer-FREE (the product boundary). So the
seam is an `unwrapValidated` ACCESSOR, not a framework-calls-renderer path:
the framework hands back the validated payload + asserts the token still binds;
the host then calls its OWN renderer with the returned tree.

This is the SAME binding guard `AICast.applyValidatedPatch` runs before it
mutates — defense-in-depth against a post-validation payload swap — generalized
to ANY target. Concretely: `unwrapValidated` is `assertTokenBinds` named for
the host's intent (its return value is what you feed your renderer/applier),
so there is exactly one un-bypassable door for BOTH targets and the framework
never reaches into a renderer it does not own.

## Type Parameters

### T

`T`

## Parameters

### proposal

[`ValidatedProposal`](../interfaces/ValidatedProposal.md)\<`T`\>

## Returns

`T`
