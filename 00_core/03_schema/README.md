# Schema and Typed Field References

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `03_schema/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Provide LiteShip's native schema algebra, strict representation admission, encoded/decoded transforms, named recursion, faithful projections, and the typed field-reference vocabulary shared by collections, state, scenes, patches, editors, operations, and agents.

## Owns

- The finite closed `SchemaNode` algebra.
- `Schema<Decoded, Encoded>` and schema ports.
- Strict decoding and encoding.
- Declarative constraints and named opaque refinement adapters.
- Named recursive definitions and explicit references.
- Defaults, discriminated unions, issue paths, and metadata.
- Schema-derived `FieldPath` and `FieldReference` values.
- JSON Schema, Standard Schema, form, operation, documentation, arbitrary-generation, storage-layout, and Rust-layout projections.

## Does not own

- Transport syntax parsing.
- Durable persistence.
- Authentication or authorization engines.
- Arbitrary executable closures inside canonical schema data.
- A second standalone path language beside schema navigation.

## Schema-as-path contract

A field reached through finite object, array, or tuple structure is one canonical semantic value with several projections:

- a `Schema` for the target value;
- a typed runtime `FieldPath`;
- a `FieldReference` bound to root schema and target schema;
- a content-addressable reference usable in patches, queries, selections, and programs;
- a value that may later be interned to a dense local slot by the memory planner.

The normal authoring surface uses eager property navigation over immutable schema field objects. Ordinary fields are available directly, so a nested schema can read as `Customer.address.city`. A complete `.fields` view remains available for a field name that collides with a schema or reference carrier such as `Type`, `Encoded`, `path`, `address`, `fields`, `element`, or `elements`. Both paths return the same canonical field objects; there is no second path authority.

Typed `SchemaReference` values preserve decoded and encoded types without carrying the full schema graph through every downstream relationship. The surface does not require string paths, template-literal deep keys, or proxy-captured JavaScript control flow.

Named references are deliberate navigation boundaries. Direct property navigation does not recursively materialize an infinite field tree. A `ReferenceSchema` exposes the named target reference, and an explicit `ComposeFieldReferences<Outer, Inner>` relationship crosses the boundary only when the outer target schema is exactly the inner root schema. The runtime `composeFieldReferences` operation will materialize the concatenated path and canonical address from those same references.

This gives recursive structures both properties they need:

- finite, eagerly inspectable schema objects;
- typed paths through explicit recursive hops.

An unrelated schema field cannot satisfy the hop, and recursion never depends on a closure-bearing lazy thunk.

## Laws

- Types carry proof; schemas manufacture it.
- Parsed syntax remains untrusted until decode succeeds.
- `unknown` is honest unresolved input; a public schema-any escape hatch does not exist.
- Unknown object fields reject by default. Strip or preserve behavior must be explicit.
- A raw string or untyped `DataPath` cannot satisfy a typed `FieldReference`.
- A field reference from one root schema cannot be used as a field reference from another.
- Direct property navigation stops at a named reference; crossing it requires an explicit compatible field-reference composition.
- Recursive schemas are finite named graphs, not closure-bearing lazy thunks.
- Every projection is faithful or returns an explicit unsupported result.
- Security-sensitive runtime admission uses a private, payload-bound witness only where provenance must remain verifiable.

## Operation vocabulary

- `schema.*` and `defineSchema` define immutable schema meaning.
- Field property access navigates the schema and returns typed field objects.
- `composeFieldReferences` crosses one explicit named-reference boundary and returns one canonical composed field reference.
- `parse` handles syntax only.
- `decode` and `encode` return `Result`.
- `validate` checks definitions or values without changing meaning.
- `project` derives another representation.
- `inspect` returns the finite graph, field references, and projection support.

## Proof obligations

- Hostile getters, poison keys, cycles, and traversal bombs never execute or enter decoded output.
- Raw strings, unbranded data paths, and foreign-schema paths fail type-level fixtures.
- Direct field navigation resolves to the exact root, target schema, decoded type, encoded type, and runtime path.
- A compatible named-reference hop composes its paths; a foreign-root hop fails at the type boundary.
- Field references serialize and address deterministically.
- Recursive definitions decode with bounded traversal and stable references.
- Transform encode/decode round-trips where declared.
- Declarative constraints agree across decode, JSON Schema, arbitrary generation, forms, docs, and operation projection.
- Unsupported projections refuse rather than widen.
- Copying a reflected witness cannot forge an admitted security-sensitive value.

## Implementation boundary

The schema algebra, typed reference model, explicit recursive-hop contract, and projection obligations are specified. Runtime constructors, eager field-object materialization, field-reference composition, decoder, encoder, and projectors are absent.

## Remaining work

No unresolved semantic decision remains. Implementation must qualify field-object allocation cost, named-reference resolution and composition, the certified opaque-adapter process, and the exact metadata consumed by each projection.

## Machine-checkable projection

```yaml
home:
  path: 00_core/03_schema
  title: "Schema and Typed Field References"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - finite-closed-schema-graph
  - direct-schema-field-navigation-with-collision-safe-fields-view
  - explicit-compatible-field-composition-across-named-references
  - field-reference-is-schema-path-and-address
  - no-public-schema-any
  - named-recursion-not-ambient-laziness
  - faithful-projection-or-refusal
  production_authority: false
```
