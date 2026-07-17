[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Decision

# Interface: Decision

Defined in: [core/src/capsule.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L82)

The typed verdict a `policyGate` capsule's [CapsuleContract.decide](CapsuleContract.md#decide)
resolves against a subject: an `allow`/`deny` effect plus a reason chain.

Discipline (the policyGate analogue of the receipt byte law): a `deny` MUST
carry a NON-EMPTY `reasons` chain naming why the subject was rejected — a
denial with no reason is a silent gate, the very thing this arm exists to
forbid. An `allow` MAY carry informational reasons (what was admitted) or an
empty chain. The harness pins exactly this: `reasons` non-empty iff `deny`.

The decision is the WHOLE authority a policyGate primitive holds — it returns
a verdict, it never enforces it. Side-effecting admission (refusing a request,
minting a token, mutating state) lives in the downstream PRODUCER that consumes
this verdict, never in the capsule primitive (ADR-0014 "no built-in authority",
consistent with the AI cast-primitive boundary).

## Properties

### effect

> `readonly` **effect**: `"allow"` \| `"deny"`

Defined in: [core/src/capsule.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L84)

Whether the subject is admitted (`allow`) or rejected (`deny`).

***

### reasons

> `readonly` **reasons**: readonly [`Reason`](Reason.md)[]

Defined in: [core/src/capsule.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L86)

The reason chain. Non-empty exactly when `effect === 'deny'`.
