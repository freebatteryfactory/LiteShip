# Web Projection and Physical Application

Status: specified; morph algorithm empirical; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/04_projection/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the physical browser commit: applying admitted core outputs — write plans, trusted-fragment patches, generated structures — to DOM and SVG through one region write authority in one coherent transaction.

## Owns

- The three write families and their routing.
- The generated-structure renderer's admitted node-to-physical mapping, separate from the semantic projection index.
- The projection commit: one authority, one revision, applied families, preserved state.
- The deployment-grounded closed component catalog identity.

## Does not own

- Patch meaning. Core owns the semantic patch families; this home commits them physically.
- Region authority or preservation vocabulary — consumed from `01_region`.
- Sink policy — consumed from `02_security` at every write.

## Three families, three routes

Core write plans arrive inside their full `RuntimeCommit` — semantic commit, resulting revision, write plan, and trace together — never as a detached plan, because the physical browser must prove which committed cut it is applying. Trusted fragments arrive as attested, revision-pinned patches over semantic locations — never raw markup, never raw selectors — and remain subject to browser policy. Generated structures arrive as admitted content that already carries its admission; no sibling copy exists to disagree with it. Model output can never enter the trusted-fragment route, and opaque foreign output is not a write family at all.

Identity has one owner everywhere. The component catalog is core's exact `ComponentCatalogAddress` — the same identity admission speaks — so content cannot be admitted against one catalog and rendered against another. The structure mapping is bound to its exact structure, revision, catalog, and admission. The commit's revision lives in its region write authority, with no sibling field to contradict it. And commit application is a declared offer requiring four authorities by exact requirement row — the region authority, the sink policy, the renderer catalog, and the event authority — imports and requirement rows, not prose dependencies.

The preserved hostile-input discipline for generated structures: iterative walking, depth and node limits, cycle detection, getter refusal, own-property-only catalog lookup, URL and attribute allowlists, explicit listener disposal, and no renderer access to an unadmitted tree.

## Laws

- Foreign output is not a write family.
- A write plan arrives inside its runtime commit, never alone.
- A commit speaks through one write authority and carries no sibling revision.
- A trusted fragment arrives as a revision-pinned patch, never raw markup.
- Admission lives in the admitted content; no sibling copy exists.
- The mapping is bound to its exact structure, revision, and the one canonical catalog.
- Applying commits is an offer requiring persistent region ownership, sink policy, the renderer catalog, and the event authority; the per-transaction authority arrives inside each commit it applies, never as a frozen requirement binding.
- One commit is one coherent transaction with preservation captured and restored.

## Proof obligations

- The hostile-input population above holds under adversarial fixtures.
- A forged structural lookalike never reaches the renderer.
- Faithful payload reachability: every admitted change reaches its physical target or the commit refuses.

The forgery claim is `system/assurance`; the rest are implementation fixtures. The exact morph algorithm is old-source implementation evidence, mined at implementation time.

## Implementation boundary

Specified with the morph algorithm explicitly empirical. No DOM construction, morphing, or rendering code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/web/04_projection
  title: "Web Projection and Physical Application"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - three-write-families-three-routes
  - foreign-output-is-not-writable
  - trusted-fragments-are-attested-patches-never-raw-markup
  - generated-structures-carry-admission-or-never-render
  - one-commit-one-transaction-one-authority
  empirical_contracts:
  - morph-algorithm
  production_authority: false
```
