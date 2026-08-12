# Vite Asset Emission

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/vite/04_asset/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Emit worker, WebAssembly, and binary assets inside the module graph, with ancestry, a digest, and a stated source relation.

## Owns

- The emitted reference id, as an ecosystem location handle.
- The generated asset: its graph entry, address, digest, source relation, disclosure, and ancestry.
- The emission outcome: emitted, unresolved ancestry, or failed.

## Does not own

- Artifact identity. Core owns it; this home binds it.
- The bundler emission mechanism.
- Worker runtime semantics. The web and worker hosts own those.

## The worker the predecessor could not explain

Its compositor worker was launched from a Blob URL assembled by interpolating three source strings: no banner, no version, no digest, no source-map link, and five independent startup strings with no canonical bootstrap. Nothing about that worker was addressable, so nothing about it was explicable.

The ecosystem already solves this. The bundler provides a canonical worker entry — a real module with a content-hashed filename, source maps, and its own configuration — so a synthesized worker body belongs in the graph as a generated module consumed through that entry, not in a string.

What the ecosystem does **not** provide is identity: an emit returns a reference id and a filename, and neither is a content address nor a record of who produced what. That distinction is this home's, and the laws hold it.

## Laws

- A bundler reference id is not artifact identity, in either direction.
- A generated asset carries core's source relation.
- A generated asset stays in the module graph: no `code`, `source`, `url`, or `blob` member exists for a string-assembled entry to hide in.
- Ancestry and the source relation are required, never optional.
- An asset that could not resolve its ancestry is distinguishable from one that legitimately resolved to nothing.
- Disclosure is carried, not inferred.

## Proof obligations

- That an emitted asset digest matches the bytes actually written.
- That a server-only asset never reaches browser-visible output.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/vite/04_asset
  title: "Vite Asset Emission"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - assets-stay-in-the-module-graph
  - reference-ids-are-handles-not-identity
  - ancestry-and-relation-are-required
  - disclosure-is-carried-not-inferred
  production_authority: false
```
