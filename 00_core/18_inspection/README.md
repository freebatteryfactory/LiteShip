# Inspection, Explanation, and Authority Discovery

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `18_inspection/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own structured inspection queries, causal explanations, canonical imports, the joined type/runtime authority graph, remediation projections, and change-impact analysis.

## Owns

- Authority identity and references.
- `AuthorityRecord`, `AuthorityEdge`, and content-addressed `AuthorityGraph`.
- Canonical import records.
- Inspection queries over symbols, entities, operations, artifacts, programs, and authorities.
- Structured explanations, facts, settlement reasoning, diagnostics, and next actions.
- Direct and transitive impact analysis.

## Does not own

- TypeScript compiler analysis implementation.
- Filesystem or repository scanning.
- CLI, MCP, HTTP, or LSP framing.
- System assurance programs.
- Regular-expression declaration discovery as semantic authority.

## Joined authority graph

System assurance derives compile-time authority from the root-pinned TypeScript compiler and Type ABI. Runtime catalogs supply schema, operation, compiler-arm, evidence-source, feature, host, target, wire, diagnostic, and proof authority.

The joined graph records one canonical owner and import while preserving aliases and projections. Neither the type graph nor runtime catalog replaces the other.

Type ABI evidence is a `TypeAbiAttestation`, not a receipt. It asserts that an identified interpreter produced an addressed canonical declaration surface.

## Laws

- Inspection reports facts and their sources.
- Explanation distinguishes sourced facts, inference, diagnostics, and remediation.
- One symbol or capability has one canonical owner and import.
- Unsupported or incomplete Type ABI coverage remains visible.
- Runtime features are connected back to the exact requirement closure that selected them.
- Impact follows actual authority and shipping edges.
- Public, expert, support-only, and private populations remain distinguishable.
- Shadow, duplicate, zombie, or unreachable authority is a finding, not an undocumented convention.

## Operation vocabulary

- `inspect` returns structured facts.
- `explain` returns causal reasoning and next actions.
- `where` may be a wire alias for an authority query, never a second engine.
- `impact` returns direct and transitive consumers.
- `reconcile` compares declared and observed authority.

## Proof obligations

- Canonical import and owner resolution through real TypeScript and export-map semantics.
- Duplicate and shadow authority detection.
- Type/runtime/export/requisite-feature reconciliation.
- Unsupported Type ABI coverage visibility.
- Impact analysis over representative semantic and package changes.
- Direct, CLI, MCP, HTTP, and LSP projection parity.
- Every remediation action names a safe, valid operation or human action.
- Type ABI attestations bind exact surface and interpreter identities.

## Implementation boundary

The query, explanation, authority, and impact contracts are specified. The system compiler analysis, catalog builders, graph container, and wire renderers are absent.

Building the compiler-derived Type ABI pipeline and runtime catalogue joins are implementation obligations. Explanation verbosity is a projection choice and does not alter the underlying structured object.
