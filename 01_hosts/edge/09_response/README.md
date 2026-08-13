# Edge Response

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/09_response/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the exact physical response and the only edge response-commit authority: plan, commitment, receipt, correlation to the exact request, and policy ancestry.

## Owns

- The response plan: status, headers, cookies, body address, exact request reference, governing policy address. A plan is inert.
- The committed response: the plan plus the receipt only the commit authority mints — carrying the receipt is what being committed means, and the types make a plan provably not a committed response.
- The commit authority itself is scoped to the one request it was granted for: it names the exact request, and its commit and open accept only plans for that request, with no method-level generic to widen through.
- The carried capability: the requirement hole carries the request-correlated `ResponseCommitGrant`, never a commit-capable authority. A static requirement row cannot name a per-invocation fresh request identity, so a broad authority in the hole would erase exactly the scoping the laws prove — instead a consumer must name an exact request reference to obtain the authority, and the only public door to a commit names its request first.
- The response-facility grounding (invocation origin) and the commit offer (policy-bound).

## Does not own

- Settlement or execution — they produce plans, never committed responses. HTTP wire semantics — downstream.

## Laws

- A plan names its exact request and its governing policy.
- Committed means carrying the receipt; a plan is not a committed response.
- Commitment and streaming are request-correlated — a plan for request A yields a committed response or stream for exactly A, streaming finishes into the same single commit, and commit failure is phase-correct (only after-commit names a receipt).
- The carried contract grants only correlated authority: granting request A yields the authority for exactly A, and no broad commit member exists on the requirement contract.

## Proof obligations

- Exactly one response is physically written per invocation, and policy is applied on the shipping path.
- `response-commit-request-agreement`: the grant answers only the request its own invocation admitted. The nonconforming witness is genuine — inside invocation A's realization, a grant call naming request B's reference compiles, because request references are data and no local generic law can distinguish the invocation's own reference from a smuggled one; the runtime provider must refuse it.

Both `system/01_assurance`; buffering-versus-streaming crossover is empirical.

## Implementation boundary

Specified. No response writer or streaming code exists or is authorized.
