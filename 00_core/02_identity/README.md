# Identity and References

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_identity/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Keep persistent subject identity, immutable revision identity, current location, draft authority, references, and local execution slots as separate facts.

## Owns

- `EntityId` and `WorldId`.
- `RevisionId`, `PatchId`, `ChangeId`, `CommitId`, `AttestationId`, `TraceId`, and `ReceiptId`.
- Typed entity, world, revision, draft, patch, change, commit, and content references.
- `SurfacePath` and semantic locations.
- Execution-image-scoped dense slot bindings.

## Does not own

- Revision bodies, change semantics, or commits.
- Durable persistence mechanisms.
- User-facing labels as primary identity.
- Dense runtime slot allocation.
- Authority merely because two references carry equal bytes.

## Semantic contracts

`EntityId` names the persistent subject. `RevisionId` names one exact immutable state. `SurfacePath` names the subject's current structural location. A local `DenseSlot` names an execution position only inside one execution image.

A draft revision may have byte-identical content and the same `RevisionId` as a committed revision. Its reference kind remains `draft-revision`, so content identity cannot masquerade as committed authority.

## Laws

- Entity identity is independent from content, name, and path.
- Revision identity is content-addressed.
- A path move may preserve both persistent identity and exact content.
- Draft and committed revision references are not assignable.
- A committed revision reference is exact over the revision it names, matching entity and world references. The broad default keeps heterogeneous populations inhabited; a relationship that must prove it commits to one specific revision instantiates the parameter and carries it through its public path.
- Dense slots never cross the semantic boundary as identity.
- Every public identity has one validated mint or decode route.
- Reference kind is authority-bearing and cannot be erased by equal carrier bytes.

## Operation vocabulary

- `create` or an owner-specific mint creates persistent identity.
- `parse` and `decode` admit external identity representations.
- `reference` constructs a typed reference only from an admitted identity.
- `inspect` reports entity, revision, authority kind, path, and local slot separately.

## Proof obligations

- Entity identity survives revision changes.
- Moving a subject changes its path without changing its identity.
- Equal revision content produces equal revision IDs.
- A draft reference fails where a committed revision is required.
- A dense slot fails where any semantic identity is required.
- Cross-image slot bindings are rejected.
- External identity parsing cannot mint malformed or undersized identifiers.

## Implementation boundary

The semantic split and type laws are specified. Runtime constructors and the external `EntityId` carrier are absent. The carrier must be opaque, content-independent, interoperability-friendly, and provide at least 128 bits of identity space.

## Remaining work

Implementation must choose and qualify the external `EntityId` representation, canonical path encoding, and slot-map realization. These are compatibility and empirical choices, not changes to the semantic model.

## Machine-checkable projection

```yaml
home:
  path: 00_core/02_identity
  title: "Identity and References"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - entity-revision-path-separation
  - draft-authority-is-reference-kind
  - dense-slot-is-local
  production_authority: false
```
