# Collections and Relational Expressions

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `10_collection/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Define schema-backed keyed collections, typed relational expressions, three-valued predicates, deterministic ordering, family-specific collection patches, and materialized views over exact world revisions.

## Owns

- Collection identity and definitions.
- Schema-derived row keys and field references.
- Value expressions and collection proposition atoms.
- Relational expressions: source, filter, project, sort, group, aggregate, join, distinct, and window.
- Query identity and parameters.
- Collection family patch changes.
- Materialized collection views pinned to exact revisions.
- Declared collection indexes and query requirements.

## Does not own

- A parallel collection revision system.
- Durable database storage or SQL execution.
- URL, HTTP, DOM, or table-widget realization.
- Arbitrary JavaScript closures as canonical query meaning.
- A second boolean proposition language.

## Definition, revision, query, and view

`CollectionDefinition` owns row schema, stable key field, legal query capabilities, and declared indexes. Its typed row schema and component reference agree on decoded and encoded row values, and its key reference must be rooted in that exact row schema. The collection reference carries that row-root identity into query construction. Rows live in the shared `WorldRevision` authority.

`CollectionQuery<Roots>` is an immutable, content-addressable relational expression whose field values, predicates, sort terms, groups, aggregates, and patch fields are restricted to its declared row roots. A single-source query has one root. A join may widen the scope to the union of its left and right roots, while its join conditions retain side-specific root parameters. `CollectionView` is the materialized result against an exact world revision. Collection patches apply through the shared revision envelope and normalize into state changes.

## Authoring surface

The canonical representation is an inspectable relational expression tree parameterized by its legal row roots. The paved-road TypeScript surface uses standard query terms and schema field objects, for example `where`, `select`, `orderBy`, `groupBy`, `aggregate`, `join`, and `window`.

A callback-shaped convenience may execute once at definition time only when it receives symbolic field objects and can lower completely into the same expression tree. JavaScript control flow, truthiness, mutation, and captured runtime state do not survive as query meaning.

Direct schema field navigation is preferred where it provides the same ergonomics without a proxy. Raw field strings are not canonical.

## Truth and null semantics

Collection predicates extend the generic strong Kleene `Proposition` algebra with typed field comparisons rooted in the query's declared row schemas. Filters retain rows whose predicate resolves `true`.

- `null` is a schema value.
- A missing optional field remains distinct from `null`.
- Pending evidence remains operationally pending.
- All may yield `unknown` truth while blockers and failures preserve the reason.
- `isNull`, `isMissing`, and `coalesce` remain explicit in the typed value/predicate algebra.

## Deterministic ordering

Every sort declares direction, a content-addressed collation profile where text comparison is required, and null placement. A backend that cannot implement the declared collation faithfully refuses or falls back explicitly. The stable row key is the required final tie-breaker unless an equivalent stable key is explicitly supplied.

Join cardinality is explicit so output schema and optionality remain derivable.

## Laws

- Collection definitions do not own current rows.
- Field references are schema-derived and query-scoped; raw strings and fields rooted outside the query fail.
- Query expressions are pure, finite, serializable, and content-addressable.
- Query truth uses the same strong Kleene evaluator as evidence propositions.
- Ordering is deterministic across SQL, JavaScript, Rust, Wasm, workers, and GPU realizations.
- Operations, patches, normalized changes, and commits remain separate layers.
- A local-only opaque expression loses pushdown, serialization, alternate backends, and broad explanation by default.

## Operation vocabulary

- `defineCollection` declares row meaning and key identity.
- `from`, `where`, `select`, `orderBy`, `groupBy`, `aggregate`, `join`, `distinct`, and `window` build the query.
- `resolve` or `execute` materializes a view through an eligible backend.
- `apply` applies a collection patch against an exact revision.
- `inspect` and `explain` expose query identity, pushdown, blockers, indexes, and backend choice.

## Proof obligations

- Raw string, foreign-key, foreign-expression, and foreign-patch fields fail type fixtures.
- Query address stability.
- Strong Kleene predicate parity across every backend.
- Deterministic sort with stable tie-breaking.
- Join cardinality and output-schema inference.
- Query result parity across scan, indexed, SQL, JavaScript, Rust/Wasm, and GPU paths where supported.
- Collection patch round-trip and stale-base refusal.
- Collection rows remain in shared world revisions.
- URL/server/local settlement preserves one query meaning.

## Implementation boundary

The relational algebra, truth semantics, revision relationship, patch family, and deterministic ordering rules are specified. Authoring helper spelling, execution engines, and index realization are absent.

Testing the authoring helpers against real TypeScript ergonomics, including direct field navigation and any optional symbolic callback form, and selecting physical index and backend realizations, are implementation and empirical obligations.
