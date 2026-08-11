# Server Database

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/05_database/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own database-provider authority: exact database identity, per-use connections, per-generation transaction leases, exact realization of core store ports, change feeds, and lifecycle.

## Owns

- Three distinct altitudes, provably so: the provider (durable), connections (per-use owned resources), and transaction leases (per-generation, closed by commit or rollback, never a long-lived binding).
- Exact port realization: a unique row of the four core store ports in, `BindingsFor` that row out.
- Pools as the durable acquisition points, contract-bound deadline-governed cancellable statement resources — the deadline relationship is architectural; its numeric value stays empirical — the migration execution facility applying addressed artifacts at a generation, change feeds as owned resources, and credentials by requirement row from the secret provider.

## Does not own

- Query, schema, or state meaning — core. Migration verb semantics — core/wires; this home supplies the execution facility. Vendor drivers — targets.

## Laws

- A lease is issued per generation for one exact connection.
- Provider, connection, and lease are three distinct altitudes.
- Port realization returns exact bindings for the exact unique row.
- Credentials come from the secret provider — by requirement row.

## Proof obligations

- Transaction, isolation, commit, rollback, cancellation, and connection lifecycle match the selected contract.

`system/assurance`; pool sizes, timeouts, and statement batching are empirical.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/server/05_database
  title: "Server Database"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - provider-connection-lease-are-distinct-altitudes
  - leases-are-per-generation
  - exact-binding-rows-for-core-ports
  - credentials-via-secret-provider
  empirical_contracts:
  - pool-sizes
  - transaction-timeouts
  - statement-batching
  production_authority: false
```
