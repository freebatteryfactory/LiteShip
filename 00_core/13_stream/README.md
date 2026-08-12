# Semantic Streams and Patch Families

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `13_stream/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own semantic event envelopes, snapshots, family patches, holds, predictions, acknowledgements, checkpoints, replay, resumption, completeness, quality, and backpressure without turning transport framing into payload meaning.

## Owns

- Stream identity, sequence, event, acknowledgement, checkpoint, and resume contracts.
- Semantic snapshot, patch, hold, and prediction frame classes.
- Explicit trusted-fragment snapshots and constrained semantic-location patches.
- Explicit hostile generated-structure snapshots and patches.
- Evidence, collection, state, scene, and media payload arms.
- Generated-structure catalog and admission contracts.
- Backpressure and overflow policy vocabulary.

## Does not own

- SSE, WebSocket, HTTP, worker-message, or browser transport mechanics.
- DOM application.
- Collection, scene, state, evidence, or media patch semantics.
- A universal JSON Patch language.
- Provider-specific model streaming.

## Security boundary: trusted fragments and generated structures

A trusted HTML or element fragment is a separately typed payload carrying a `TrustedFragmentAttestation` from a trusted producer. It never accepts model output merely because the bytes parse. Its patch family can replace, insert, remove, or move fragments only through revision-pinned semantic locations, never raw DOM selectors or an unrestricted DOM instruction language.

An untrusted generated structure is admitted through a closed host catalog and a bounded semantic structure grammar. Its `GeneratedStructureAdmission` is a different reference kind from a trusted-fragment attestation. It can update only legal components, fields, content, hierarchy, and operation bindings. It never enters the trusted-fragment path.

A **catalog component** here — `CatalogComponentId`, `CatalogComponentDefinition` — is an admission entry with props, a child grammar, and allowed operations. It is not a **state component** (`00_core/08_state`), which is schema-backed world state with a storage profile. Both were once named `ComponentId` and, worse, shared the brand `liteship.component-id`, which made them one type to the compiler: a state component identity assigned to a catalog component slot with no error. The names and brands are now distinct, and `verification/gates/authority.mjs` refuses any future tag shared across two homes.

The type surface pins the exact payload membership of both stream arms and proves that their payload unions have no assignable overlap. Runtime implementation must still authenticate the corresponding private minting and decoding paths. Static arm separation is not treated as a substitute for runtime provenance.

The successor stream roster therefore includes:

- trusted fragments;
- generated structures;
- evidence updates;
- collection patches;
- state changes;
- scene patches;
- media events.

Acknowledgement, checkpoint, resumption, and operation receipts are control records, not interchangeable payload families.

## Shared envelope and family payloads

Every event carries stream identity, sequence, semantic kind, completeness, base/result identity where relevant, causal predecessor, and payload.

Each family keeps its own legal patch algebra. A stream projects it; it does not reinterpret it.

Frame classes mean:

- snapshot establishes complete semantic structure or topology;
- patch applies a typed family mutation against an exact base;
- hold commits no semantic mutation while target-native motion may continue;
- prediction carries a real future candidate with horizon and invalidation behavior.

## Laws

- A transport does not define payload semantics.
- Model output never enters the trusted-fragment arm.
- Trusted-fragment and generated-structure arms have exact, non-overlapping payload rosters and distinct attestation reference kinds.
- Every patch names its family and exact base revision.
- Unknown payload versions fail closed.
- Acknowledgement names the exact event safely observed.
- Checkpointing authorizes bounded prefix compaction.
- Backpressure and overflow are explicit.
- Quality may remove optional richness but never truth, authority, security, accessibility, or required interaction.
- Reconnection preserves semantic identity and does not duplicate committed effects.

## Operation vocabulary

- `append` adds an admitted event.
- `acknowledge` confirms observation.
- `checkpoint` creates a recovery point.
- `resume` continues from an acknowledged point.
- `apply` belongs to the family patch owner.
- `inspect` and `explain` expose gaps, blockers, replay, trust, and quality.

## Proof obligations

- Mutation fixtures fail when either stream arm admits a payload from the other family.
- Generated structures cannot satisfy trusted-fragment types, attestation kind, decoder route, or runtime admission.
- Getter, cycle, depth, node-count, prop, child, URL, and operation-binding refusal.
- Snapshot/patch/hold/prediction classification follows semantic changes, not token arrival.
- Replay and resumption produce the same resulting revisions as uninterrupted delivery.
- Duplicate events do not duplicate business effects.
- Every family payload round-trips under its own schema.
- Backpressure and overflow behavior is bounded and observable.
- Quality preserves hard invariants.

## Implementation boundary

The roster, trust boundary, shared envelope, generated-structure family, and control records are specified. Physical transports and domain patch implementations are absent.

## Remaining work

Implementation must finalize the minimal generated-structure operation set through real UI fixtures and port the old bounded buffer, replay, and admission behavior. No roster or security-boundary decision remains open.

## Machine-checkable projection

```yaml
home:
  path: 00_core/13_stream
  title: "Semantic Streams and Patch Families"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - one-stream-envelope-family-specific-payloads
  - trusted-fragment-separated-from-generated-structure
  - exact-non-overlapping-payload-rosters-and-distinct-attestation-kinds
  - trusted-fragment-constrained-semantic-location-patch
  - semantic-snapshot-patch-hold-prediction
  - bounded-replay-resume-backpressure
  production_authority: false
```
