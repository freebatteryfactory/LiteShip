# Edge Storage

Status: provisional; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/07_storage/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own optional edge-physical providers realizing lawful subsets of core's revision, snapshot, change-log, and blob ports through deployment bindings.

## Owns

- The closed store-port union — exactly the four core ports, no locally authored twins.
- Exact construction: a unique row in, `BindingsFor` that row out; duplicates uncallable.
- The deployment-store grounding and the store offer.

## Does not own

- Port meaning — core `08_state`. Vendor APIs — targets. Consistency semantics beyond what the selected ports declare.

## Laws

- Construction returns exact bindings for the exact unique row.
- A foreign hole is not a store port — the union is closed.

## Proof obligations

- Provider semantics agree with the selected upstream ports at runtime.

`system/assurance`; batching is empirical.

## Implementation boundary

Provisional and specified. No KV, R2-like, or storage driver code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/edge/07_storage
  title: "Edge Storage"
  maturity: provisional
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - exact-binding-rows-for-core-ports
  - closed-store-port-union
  - deployment-bound-providers
  production_authority: false
```
