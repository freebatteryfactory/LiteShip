# Cloudflare Adapter Identity

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/cloudflare/00_integration/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Answer who this child is and what it may claim about the platform generation it deploys to — registrable on its own, naming no framework.

## Owns

- The adapter identity and reference.
- This child's ecosystem-target identity, as an exact instantiation of the umbrella's.
- Compatibility evidence across four altitudes.
- The binding of one adapter definition to one exact target configuration revision.

## Does not own

- A second ecosystem-target brand.
- Any framework. This child imports no sibling and names none.
- Platform credentials or accounts.

## The package this child exists to replace

The predecessor's Cloudflare package is the reason the sibling-exclusion rule exists at all. It imported a framework sibling, and it lost its independent story completely: no direct worker entry anywhere in the repository, a README that required the framework, a health probe literally labelled after the framework's output mode, and exactly one example — the framework one.

The two target packages that imported no sibling both kept first-class direct use. That is not a coincidence anyone needs to argue about; it is a natural experiment with a clean result.

So "direct platform use without a framework" is not a hypothetical requirement here. It is a correction of a specific historical failure, and `RegistrationNamesNoFramework` is where it is enforced.

## Laws

- This child names the Cloudflare ecosystem target and no other.
- Registration names no framework: `astro`, `framework`, `integration`, `middleware`, and `outputMode` are absent by law.
- Compatibility keeps four altitudes distinct.
- Absent evidence is not support, and a degraded claim states its limits.

## Proof obligations

- That recorded compatibility evidence describes the platform generation actually targeted.
- That the adapter registers and deploys with no framework present.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/cloudflare/00_integration
  title: "Cloudflare Adapter Identity"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - identity-instantiated-never-redeclared
  - registration-names-no-framework
  - compatibility-is-evidence-not-constant
  - absent-evidence-is-not-support
  production_authority: false
```
