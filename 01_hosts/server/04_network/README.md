# Server Network

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/04_network/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own physical network providers: decoder-correlated outbound connections, listener and accepted-socket resources, endpoint admission, bounded receive, cancellation, and lifecycle.

## Owns

- Outbound connections that send and receive, whose decoder and received values share one decoded type.
- Listeners as owned resources accepting usable per-use connections — never bare references — at admitted endpoints.
- The endpoint allowlist carrier — admitted, never a raw string.

## Does not own

- HTTP meaning — the later HTTP wire. Stream semantics — core. TLS profile constants — empirical/deployment.

## Laws

- Connecting is decoder-correlated; one decoded family is not another.
- Connections and listeners are endpoint-admitted, bounded, and owned.

## Proof obligations

- Every connect and listen consults the allowlist on the shipping path.

`system/assurance`; timeouts, socket buffers, and reuse are empirical.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/server/04_network
  title: "Server Network"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - decoder-correlated-connecting
  - endpoint-admission-for-connect-and-listen
  - listeners-accept-per-use-connections
  empirical_contracts:
  - timeouts-and-buffers
  - connection-reuse
  production_authority: false
```
