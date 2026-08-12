# Astro Configuration Admission

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/astro/01_configuration/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Separate configuration the ecosystem hands over from configuration this child is willing to act on, and classify every admitted field by whether it may cross into browser-visible output.

## Owns

- Raw configuration: origin plus unvalidated contents. The one place in this child where an unvalidated value is representable.
- Admitted configuration: bound to an exact configuration revision, stating its build output mode.
- Field-level disclosure classification, public or secret.
- The admission decision, and its diagnostics.

## Does not own

- Any other home's configuration shape.
- Secret material itself. This home classifies; it does not store.
- What a build does with an admitted configuration. `03_build` owns that.

## Laws

- Raw configuration cannot stand in for admitted configuration, in either direction — a one-directional test passes when the two collapse.
- Admitted configuration pins an exact revision, and two revisions of one configuration are not interchangeable.
- A malformed admission carries diagnostics and no configuration, so nothing can reach past the diagnostics for the value that failed.
- Disclosure is exact on the field carrying it: a secret field is not assignable where a public one is required.

## Proof obligations

- That an admitted configuration was actually validated rather than asserted.
- That no secret-classified field reaches a browser-visible artifact.
- That configuration origin is recorded faithfully rather than reconstructed after merging.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/astro/01_configuration
  title: "Astro Configuration Admission"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - raw-is-not-admitted
  - disclosure-is-carried-not-inferred
  - admission-failure-carries-no-value
  - exact-configuration-revision
  - origin-survives-merging
  production_authority: false
```
