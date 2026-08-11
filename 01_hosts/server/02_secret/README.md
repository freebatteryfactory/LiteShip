# Server Secrets

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/02_secret/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own secret-provider authority: opaque references that never carry material, identity-correlated scoped revelation, rotation and revocation evidence, and redaction discipline.

## Owns

- Opaque `SecretScopedReference` values — the only secret-shaped thing broad contexts ever hold.
- `RevealedSecret<Id>`: identity-correlated (revealing A provably yields A's revelation), with exactly three members — the identity, the scoped `use` operation, and its disposal. Material never appears as a field: it exists only as the input of a `SecretConsumer<Id>` admitted for exactly this secret, so broad contexts, receipts, logs, and object traversal have nothing to reach. That code explicitly admitted into the consumer boundary can still leak what it is given remains the standing assurance obligation.
- Disposition observation without revelation: current, rotated, revoked.

## Does not own

- Authorization semantics — operations and their authority requirements. Credential use — consuming homes require the provider by row (the database offer does exactly this).

## Laws

- Revelation is identity-correlated — A's revelation is not B's.
- A revealed secret's members are exactly `reveals`, `use`, and `dispose`; material appears only as the consumer's input, and a consumer of secret B cannot be used for secret A.
- Disposition never reveals, over closed arms.

## Proof obligations

- Material never leaks into logs, receipts, addresses, or generated artifacts; revealed material is disposed exactly once.

`system/assurance`.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/server/02_secret
  title: "Server Secrets"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - opaque-references-in-broad-contexts
  - identity-correlated-revelation
  - no-serialization-surface-on-revealed-secrets
  production_authority: false
```
