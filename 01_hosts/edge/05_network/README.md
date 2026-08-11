# Edge Network

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/05_network/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own physical outbound network resources: decoder-correlated connection opening, policy-admitted origins, bounded receive, cancellation, lifecycle, and failure.

## Owns

- The outbound connection: per-use owned resource whose decoder and received values share one decoded type, correlated to the exact outbound request that opened it — which carries its own physical request identity, method, and addressed body, not merely an origin.
- The decoder-correlated `open` on the network provider.
- The offer's policy requirement: no connection opens outside the allowlists.

## Does not own

- Core stream families or the HTTP operation wire — consumed and projected downstream, never restated.
- The policy itself — `03_policy`.

## Laws

- Opening is decoder-correlated; one decoded family is not another.
- A connection sends and receives, bounded, owned, cancellable, and origin-admitted.
- The offer requires the policy — networking cannot stand alone.

## Proof obligations

- Every open consults the policy on the shipping path.

`system/assurance`; timeouts, retries, and connection reuse are empirical.

## Implementation boundary

Specified with physical profiles deferred. No fetch or socket code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/edge/05_network
  title: "Edge Network"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - decoder-correlated-opening
  - policy-required-for-networking
  - connections-are-bounded-owned-resources
  empirical_contracts:
  - timeouts-and-retries
  - connection-reuse
  production_authority: false
```
