# Web Regions and Write Authority

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/01_region/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own physical render-region identity, boundaries, custody, and the one-writer-per-region-per-transaction authority through which every browser mutation flows.

## Owns

- Document, node, region, and writer identities. Physical node handles are opaque references, never raw DOM interfaces.
- Region boundaries and explicit exclusion of nested regions.
- Custody: static output, one owned LiteShip writer, or an opaque foreign boundary.
- Explicit, revision-pinned claim, transfer, and release.
- The revision-pinned projection index from semantic addresses to physical nodes.
- The preservation population a commit honors.

## Does not own

- Patch meaning, write application, or rendering. `04_projection` applies; core means.
- Semantic addressing. `SemanticLocation` belongs to core identity; this home only resolves it physically.

## What a region is

A bounded physical browser egress domain whose nodes and browser-managed state may be observed and mutated atomically by one declared writer for one transaction. It is not a component, a semantic world, a `SemanticLocation`, a CSS selector, or permanent ownership of every descendant. Static Astro output, LiteShip residual regions, trusted-fragment regions, and opaque foreign islands coexist by exclusion, never by racing.

No writer obtains authority merely because it can reach a DOM node. An application may transfer an existing mount region at bootstrap; LiteShip claims a region only through a declared admission or construction path; transfer between writers is explicit and revision-aware; release disposes the writer's owned listeners and resources.

A foreign region is an exclusion boundary: its internals are never mutated or read as semantic state, its anchor may be preserved, and the whole boundary moves or is replaced only when its declared ownership contract permits.

## Preservation

Focus, selection, scroll, form state, media state, browser-managed state, and foreign boundaries are captured before a physical commit and restored or retained after it, where applicable. Preservation does not automatically become core semantic state, and this population is deliberately not an enumeration of every browser property.

## Laws

- One writer, one region, one transaction, one committed revision.
- A foreign region carries no writer.
- Every custody transition is revision-pinned; none is implicit.
- A boundary declares its exclusions.
- Addresses are semantic locations or projection targets, never raw selectors.
- The projection index is pinned to one exact revision, and discovery resolves inside a named region at an exact revision — never a bare subject.
- The plan selects one region manager; memberships are its repeatable resources. A claim consumes an admitted mount — a physical boundary — and produces a membership carrying that boundary; two regions are two memberships, never one deduplicated hole.
- Release and transfer operate on existing custody; neither constructs a provider.
- The manager issues one transaction-scoped lease per commit, tied to its membership; region and writer live in the membership once, with no restated sibling fields.
- A transferred mount enters as an application or invocation grounding.

## Proof obligations

- No code path mutates a foreign-owned descendant, and morphing never descends into an excluded boundary.
- Preservation is honored under real browser state, including concurrent user interaction.
- The physical index agrees with the committed revision it claims.

The first and third are assurance-with-fixtures territory; the second is behavioral and empirical.

## Implementation boundary

Specified. No DOM observation, claiming, or mutation code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/web/01_region
  title: "Web Regions and Write Authority"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - one-writer-per-region-per-transaction
  - regions-coexist-by-exclusion-never-racing
  - custody-transitions-explicit-and-revision-pinned
  - foreign-regions-are-opaque-boundaries
  - semantic-addresses-never-raw-selectors
  - preservation-is-physical-not-automatically-semantic
  production_authority: false
```
