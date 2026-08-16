# Revisioned State and World Algebra

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `08_state/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own immutable world revisions, normalized changes, transactions, typed relations, ECS/world semantics, index plans, draft forks, commits, and persistence ports without making one storage engine or dense ECS the semantic authority.

## Owns

- The cut as a *carried* fact: `Commit` is generic over it, so the exactness survives every downstream carrier.
- The semantic cut: one exact world, revision, temporal coordinate, and evidence population, addressed.
- The draft cut, which is the same coordinate over a candidate revision that was never committed.
- Component and relation definitions.
- World definitions, revisions, snapshots, and references.
- Generic `RevisionPatch<Family, Change>` envelopes.
- Patch preconditions, normalized `StateChange`, `ChangeSet`, transactions, commits, forks, and compare-and-swap semantics.
- Semantic revision, dense data, scene, interaction, and future replicated world realizations under one world algebra.
- Addressed subworlds and declared ports.
- Storage profiles and compiler-visible index plans.
- Conformance contracts for in-memory revision models.
- `RevisionStore`, `SnapshotStore`, `ChangeLog`, and `BlobStore` ports.

## Does not own

- IndexedDB, SQLite, PostgreSQL, D1, KV, filesystems, or object stores.
- Collection, scene, or generated-structure domain patch membership.
- Dense memory layout.
- Replication algorithms.

## Typed components

A component definition binds one stable typed component reference to one decoded/encoded schema relationship and one requested storage profile. Component state recovers its value type from that reference instead of restating an unrelated generic. Columnar key requests are rooted in the component's own schema.

## Revision and patch contract

A family operation lowers into a family-specific patch. The patch names an exact base revision and carries family changes plus preconditions. Field preconditions use the shared `EntityFieldReference`, binding the persistent subject and schema-derived field as one target. Applying a valid patch yields normalized `StateChange` values. One transaction commits one coherent `ChangeSet` into one immutable revision.

Operation intent, family patch, normalized change, packed execution delta, and commit are separate layers with one authority each.

## World realizations

- Semantic revision worlds preserve authored meaning, branches, relations, and history.
- Dense data worlds realize high-cardinality or numeric workloads.
- Scene worlds realize spatial and temporal scene behavior.
- Interaction worlds represent devices, techniques, and controls where that model earns itself.
- Replicated worlds remain a future merge realization over the same identities and changes.

An addressed subworld has its own world identity, revision, local coordinate systems, declared ports, lifecycle, and explicit parent-transaction relationship. It is not an opaque nested tick loop.

## Persistence boundary

Core defines what must be stored and the compare-and-swap, snapshot, append, load, and blob contracts. Hosts choose where bytes live. A durable adapter cannot reinterpret revision, change, or commit meaning.

## Laws

- A commit is exact over its cut. Carrying the broad form here would have erased an exact coordinate at the first public carrier and left every downstream projection agreeing only in shape — the defect class the host layer paid four folds to close, reappearing one tier up.
- A cut names all four axes. A revision reference does not identify the world it belongs to, so a coordinate carrying revision alone looks complete and means less than it claims.
- A cut is exact on every axis independently.
- A draft cut cannot satisfy a committed cut in either direction. The two differ by one reference kind, and that kind is the whole distinction.
- A commit carries its cut once. `result` and `time` are absent by law — their return would reintroduce members that agree with the cut until the first time they do not.
- Committed revisions are immutable and content-addressed.
- Drafts and forks never mutate their base.
- Every patch names an exact base.
- A field precondition binds the persistent entity and schema-derived field as one target.
- Stale or failed preconditions refuse visibly.
- One transaction publishes one coherent cut.
- Dense slots and storage profiles are realizations, not public identity.
- Collection rows and scene entities participate in world revisions instead of creating parallel revision authorities.
- Derived indexes are rebuildable from the revision they index.
- Durable persistence remains behind typed ports.

## Operation vocabulary

- `defineComponent`, `defineRelation`, and `defineWorld` declare meaning.
- `fork` creates a non-authoritative branch.
- `apply` applies a validated family patch.
- `commit` publishes one coherent revision.
- `merge` combines explicit branches under a declared policy.
- `snapshot` and `checkpoint` accelerate recovery without replacing history.
- `planIndexes` derives physical indexes from declared queries and systems.

## Proof obligations

- Entity identity survives content and path changes.
- Component references, schemas, and admitted state values preserve one decoded/encoded type relationship.
- Draft isolation and exact-base compare-and-swap.
- A type-level mutation fixture fails if a field precondition drops either its entity or schema-derived field.
- Patch apply and diff round-trip for every family.
- No partial transaction cut is observable.
- Relation cycles and family invariants refuse where prohibited.
- Indexes rebuild to the same query result as a scan.
- Reference, persistent-map, paged-table, and dense realizations pass one conformance suite.
- Persistence adapters preserve canonical revision and commit identity.
- Collection rows use the shared world revision authority.

## Implementation boundary

State realizations must preserve revision ancestry, patch legality, commit identity, deterministic ordering, and query conformance; in-memory structures and physical indexes remain evidence-selected choices.

Selecting sparse persistent structures, paged tables, relation indexes, snapshot cadence, and dense projection thresholds is empirical benchmarking work. This home owns no replication: a replication architecture would compose through family patch and conflict semantics and would be an explicit architecture reopening, not an unstated obligation.
