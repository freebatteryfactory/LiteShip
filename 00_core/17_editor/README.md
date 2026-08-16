# Editor and Agent Control

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `17_editor/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own semantic selection, revision-pinned working overlays, draft previews, history cursors, proposals, approvals, and one shared human/agent operation flow over the same state and compiler used at runtime.

## Owns

- Preview and counterfactual projection over exact draft cuts.
- Editor session and selection identity.
- Revision-pinned `SelectionSet` and selection resolution.
- Working overlays whose entries bind operation invocation, family patch, and normalized change.
- Draft preview branches.
- History cursors and scrub coordinates.
- Edit proposals and projections of operation policy decisions.
- Human and agent interaction contracts.

## Does not own

- DOM editor widgets.
- Model orchestration or provider prompts.
- Durable persistence.
- Operation risk classification.
- A separate agent mutation language.
- A replication algorithm.

## Editor state model

The editor composes five distinct layers:

1. committed revision DAG for authoritative semantic history;
2. operation history for intent and accountability;
3. working overlay for uncommitted local operations;
4. snapshots and checkpoints for loading and replay performance;
5. history cursor for undo, redo, and scrub as user-experience projections.

No layer independently claims current truth.

## Working overlay

An overlay stores derived entries, not parallel editable realities:

- operation invocation expresses intent;
- family patch expresses legal domain mutation;
- normalized change expresses state transition.

Every patch and change is deterministically linked to the operation that produced it. Callers cannot edit the normalized change independently of the operation.

## Draft authority

A preview result uses `DraftRevisionReference`. It may carry the same content-addressed `RevisionId` bytes as a committed revision, but its reference kind prevents it from being accepted where committed authority is required.

## Selection

Selections use persistent identities and schema-derived references rather than CSS selectors or transient array offsets. A field selection uses the shared `EntityFieldReference`, so it identifies both the persistent subject and the schema location. A selection may target entities, fields, rows, timeline keys, geometry points, or generated-structure nodes.

After another revision, resolution reports resolved, moved, deleted, stale, or ambiguous. It never silently redirects yesterday's target to whatever now occupies the old path.

## Human and agent flow

Both use:

inspect → list affordances → propose operation → preview draft → explain consequences → approve or refuse → commit → receive outcome

A proposal carries one admitted invocation, exact base, and explanation; the invocation is the sole owner of the operation reference.

Agents receive explicit delegated authority, requirements, budgets, and approval constraints. They never inherit ambient user authority.

Approval is derived from `OperationPolicyDecision`, effects, reversibility, authority, effective resource budget, host policy, and context. The editor contains no free-form `risk` field.

## Laws

- The overlay owns the base once. `PreviewBranch` restated it, which was two preview-base facts awaiting disagreement.
- A working overlay's base is one exact cut, not a revision here and a time cut two members away.
- A preview produces a draft cut and cannot hand back a committed one. The editor is the one place where that distinction is a one-member change away.
- Committed revision remains authority.
- Working overlays and previews are non-authoritative.
- Draft references cannot satisfy committed revision contracts.
- Preview never mutates the base.
- Humans and agents use one operation language.
- Selection is revision-pinned and identity-based.
- Uncommitted undo may rewrite the overlay; committed undo creates a compensating operation and new commit.
- Separation of duties is preserved for consequential operations.
- Synthetic evidence cannot become authoritative without an accepted commit.

## Operation vocabulary

- `select`, `inspect`, `explain`, `propose`, `preview`, `apply`, `commit`, `reject`, `replay`, `undo`, `redo`, and `scrub` retain their established meanings.
- `approve` projects an operation-policy decision; it does not invent risk.

## Proof obligations

- Draft/committed type distinction.
- Preview isolation and exact-base commit.
- Operation-to-patch-to-change derivation.
- Selection rebasing and explicit deletion/ambiguity outcomes.
- Undo/redo behavior before and after commit.
- Human/agent operation equivalence.
- Delegated authority, approval threshold, and separation-of-duties enforcement.
- Synthetic evidence isolation.
- Runtime/editor egress parity at the same revision and time cut.

## Implementation boundary

Editor realizations must preserve session, overlay, draft, selection, proposal, approval, and committed-result relationships; visual interaction and collaboration remain consumer-driven design work.

Pressure-testing selection and history ergonomics in real scene, collection, and generated-structure editors is an implementation obligation. This home owns no replication: it would compose through family merge policies and would be an explicit architecture reopening, not a reshaping of this baseline.
