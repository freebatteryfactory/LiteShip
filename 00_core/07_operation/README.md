# Operations and Delegated Authority

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `07_operation/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Define one protocol-neutral operation model for application actions, system programs, humans, agents, direct calls, HTTP, CLI, MCP, and editor controls.

## Owns

- Operation identity, definition, invocation, and outcome.
- Input, output, and failure schemas.
- Exact typed requirements.
- Effect classes, business effects, reversibility, idempotency, and cancellation.
- Independent rate, quota, concurrency, byte, duration, fan-out, cost, step, and token limits.
- Subject, actor, workload, client, delegate, purpose, and delegated authority.
- Operation policy decisions and approval requirements.
- Operation receipts as acknowledged outcomes.

## Does not own

- OAuth, OpenID Connect, TLS, sessions, credentials, or concrete policy engines.
- HTTP routes, CLI syntax, MCP framing, or LSP framing.
- Database, filesystem, network, and process handlers.
- Editor-owned free-form risk labels.

## Authority contract

An operation is a unit of delegated power to cause a declared effect, not merely a function or endpoint. Consequential operations bind subject, actor, workload, client, delegate, target, purpose, authority scope, expiry, budget, reversibility, and approval requirements where those facts apply.

Field-level authority uses the shared `EntityFieldReference`, preserving both the persistent subject and schema-derived field identity. An unbound schema path is not sufficient authority to read or modify whichever entity happens to carry that shape.

Resource governance is multidimensional. Rate, quota, concurrency, payload, duration, fan-out, economic cost, step count, and token count remain uniquely named independent limits. Definition, delegation, and invocation requests compose into one policy-derived effective budget rather than one caller-authored score or duplicate limit list.

Risk and approval are derived from the operation definition, business effects, reversibility, delegated authority, effective budget, host policy, and current context. A caller or editor cannot relabel its own request as low risk.

## Laws

- Every operation has one canonical definition and one protocol-neutral invocation model.
- Raw input is decoded before a handler sees it.
- Missing requirements refuse before execution.
- Ordinary domain failure returns an `OperationOutcome` rather than escaping as an untyped throw.
- Delegated authority names target, permitted effect, expiry, and further-delegation boundary.
- A high-risk actor cannot request, approve, and exercise its own privilege expansion when separation of duties is required.
- Wires project the same definition and outcome.
- A receipt records an acknowledged operation or transaction outcome, not arbitrary addressed data.

## Operation vocabulary

- `defineOperation` declares immutable operation meaning.
- `invoke` dispatches one admitted invocation.
- `authorize` or `decide` belongs to a bound policy authority and returns a structured policy decision.
- `preview` computes a counterfactual outcome without committing.
- `commit` accepts a resulting change under state authority.
- `inspect` and `explain` expose effects, requirements, policy, and remediation.

## Proof obligations

- Catalog and handler bindings are total for the selected composition.
- Input decode precedes handler execution.
- Missing and incompatible requirements produce structured refusal.
- Direct, HTTP, CLI, MCP, and editor projections preserve definition and outcome identity.
- Idempotency and duplicate-delivery behavior prevent repeated business effects.
- Approval derives from operation policy inputs and cannot be caller-authored.
- Agent delegation cannot exceed sponsor authority, target scope, or effective resource budget.
- Definitions and delegations cannot declare an empty business-effect set.
- Operation receipts bind invocation, decision, result, and resulting state transition where applicable.

## Implementation boundary

The operation and delegated-authority contracts are specified. Handler composition, policy engines, wire projections, and host bindings are absent.

Qualifying policy integration, idempotency storage requirements, cancellation propagation, and protocol projections are implementation obligations this architecture already authorizes.
