# Web Graphics

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/09_graphics/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own physical canvas, WebGL, and WebGPU: context and device acquisition, loss, resource lifetime, and the application of admitted scene or runtime outputs to browser graphics egresses.

## Owns

- Graphics resource identity, the closed context-kind set, and owned lifetime.
- Context and device loss as typed evidence.

## Does not own

- Scene meaning, geometry, shaders, execution kernels, backend parity, or settlement. Core owns them.
- A default GPU reconciliation architecture. That remains research.

## Loss is evidence; acquisition is an offer

The GPU capability probe is web evidence. The access facility is an intrinsic grounding, and the plan selects one `GraphicsAuthorityOffer` requiring it. The provider acquires devices and contexts against real physical targets as repeatable owned resources, and an injected precreated context reaches the same lawful egress through the provider's adopt operation, its custody representable through the resource's lifecycle parameter. When a lawfully bound context or device is lost, that is a fact about the world reported as typed evidence — never converted into a missing binding, never fabricated as a construction failure. A GPU authority that reports no adapter is bound and working.

## Laws

- Loss carries evidence and never a fabricated failure.
- The physical context set is closed and declared.
- The plan selects one graphics provider: it acquires repeatable resources against real physical targets, adopts injected precreated resources into the same lawful egress path, and carries the egress that applies committed outputs — a device without its egress is furniture.
- The egress applies committed outputs, never loose writes.
- Injected custody is representable.

## Proof obligations

- No code path converts loss evidence into a missing binding or failure.
- Acquired devices dispose exactly once under repeated loss and reacquisition.

The first is assurance; the second is an implementation fixture.

## Implementation boundary

Specified with physical profiles deferred: WebGPU thresholds and backend crossover points are empirical and measured. No context acquisition or rendering code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/web/09_graphics
  title: "Web Graphics"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - probe-is-evidence-device-is-an-offer
  - loss-is-evidence-never-fabricated-failure
  - closed-context-kind-set
  - gpu-reconciliation-stays-research
  empirical_contracts:
  - webgpu-thresholds
  - backend-crossover
  production_authority: false
```
