# Web Persistence

Status: provisional physical realization; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/07_persistence/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own optional browser-store offers over core's four persistence ports: `RevisionStore`, `SnapshotStore`, `ChangeLog`, and `BlobStore`, whose canonical requirement holes core already declares.

## Owns

- Browser database identity.
- The store-port row: a non-empty exact subset of the four owner-imported holes.
- The offer shape by which a browser provider fills that subset — singly, or atomically when one transaction domain genuinely backs several.

## Does not own

- Store meaning or database consistency semantics. Core owns the contracts.
- A mandatory default. None of the four ports is required; residual demand selects providers; island correctness is never coupled to durable browser storage.
- localStorage, Cache Storage, or local-first replication. Browser APIs do not earn homes by existing, and CRDT behavior remains research.

## Provisional, honestly

This home is lawful and valuable but not a ledger-proven port: the packet does not establish that the old web runtime shipped IndexedDB realizations of these ports. The architecture therefore permits an IndexedDB offer without asserting one existed, and the umbrella machinery already carries the hard parts — non-empty unique provided rows, sealed failure, full inseparable materialization counted once, one provider lifecycle disposed once, incidental provision never becoming demand.

## Laws

- A store row cannot smuggle a hole that is not a store port.
- An atomic provider declares the exact subset it provides.
- A store provider is constructed from the intrinsic database facility, never from nothing.
- Opening yields a database authority whose generic construction returns exact ordered `BindingsFor` the requested row — a request for revision and snapshot stores cannot be satisfied by two blob-store bindings, and an `OwnedResource` alone is a lifetime, not a database.

## Proof obligations

- A provider claiming atomicity is backed by one genuine transaction domain.
- Consumers receive only the ports they declared, while the provider's full cost counts once.

Both are assurance-and-implementation territory when a concrete provider exists.

## Implementation boundary

Provisional. No IndexedDB code, no database schema, no driver exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/web/07_persistence
  title: "Web Persistence"
  maturity: provisional-physical-realization
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - four-owner-imported-ports-exact-subsets-only
  - no-mandatory-default-store
  - island-correctness-never-coupled-to-browser-storage
  - no-local-first-replication-here
  production_authority: false
```
