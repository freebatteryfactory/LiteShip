# Astro Integration Identity

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/astro/00_integration/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Answer who this child is and what it may honestly claim about the ecosystem it attaches to. Ecosystem versions and hook names change on someone else's schedule, so they live inside compatibility evidence rather than in the architecture.

## Owns

- The Astro integration identity and reference.
- This child's ecosystem-target identity, written as an exact instantiation of the umbrella's.
- Compatibility evidence across four altitudes: supported, degraded, refused, unavailable.
- The binding of one integration definition to one exact target configuration revision.

## Does not own

- A second ecosystem-target brand. The umbrella owns that identity; this home instantiates it.
- Hook names, version ranges, or bundler generations as semantic constants.
- Configuration admission. `01_configuration` owns the trust boundary.

## Why absence is an altitude of its own

`refused` knows the range and says no. `unavailable` could not determine the range at all. Collapsing them turns "we did not look" into "we checked and it is fine" — which is what a silent degradation looks like once it is written down. The predecessor shipped a doctor probe that reported a target healthy because nothing had contradicted it yet.

## Laws

- An integration reference is exact over the integration it names.
- This child names the Astro ecosystem target and no other, checked against the literal instantiation rather than against its own alias.
- Compatibility keeps four altitudes distinct, checked by tag — two arms with one payload are interchangeable to the compiler whatever the comments say.
- Absent evidence is not support: `unavailable` carries no range and no evidence address, and `supported` carries no diagnostics.
- A degraded claim states what it cannot do; an empty limitation list is indistinguishable from full support.

## Proof obligations

- That recorded compatibility evidence describes the ecosystem actually present at build time.
- That a version range claimed as supported was genuinely exercised rather than assumed.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/astro/00_integration
  title: "Astro Integration Identity"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - identity-instantiated-never-redeclared
  - compatibility-is-evidence-not-constant
  - absent-evidence-is-not-support
  - degradation-states-its-limits
  - four-compatibility-altitudes
  production_authority: false
```
