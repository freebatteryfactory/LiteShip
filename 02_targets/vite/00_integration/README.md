# Vite Integration Identity

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/vite/00_integration/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Answer who this child is, what it may claim about the bundler generation it attaches to, and — required, never optional — where its projection applies.

## Owns

- The plugin identity and reference.
- This child's ecosystem-target identity, written as an exact instantiation of the umbrella's.
- Build environment names, and the non-empty applicability that says where a projection is active.
- Compatibility evidence across four altitudes.

## Does not own

- A second ecosystem-target brand.
- An enumeration of environment names. The host decides how many exist and what they are called.
- Bundler, tooling, or environment-API versions as semantic constants.

## Why applicability is a required member

The ecosystem activates a plugin in **every** environment when applicability is not declared, and a host may construct several — a client environment, a server one, a prerender one, a framework one. So an undeclared scope is not "unscoped"; it is scoped to everything, which is a decision nobody made and nobody reviewed.

Making the empty case unrepresentable is the whole point. There is no spelling here for "applies nowhere in particular".

## Laws

- This child names the Vite ecosystem target and no other.
- Applicability is always declared and non-empty, so universal activation cannot be spelled as an omission.
- Compatibility keeps four altitudes distinct.
- Absent evidence is not support.

## Proof obligations

- That declared environments match the environments the host actually constructed.
- That a projection never runs in an environment it did not name.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/vite/00_integration
  title: "Vite Integration Identity"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - identity-instantiated-never-redeclared
  - environment-scope-is-required-not-default
  - compatibility-is-evidence-not-constant
  - absent-evidence-is-not-support
  production_authority: false
```
