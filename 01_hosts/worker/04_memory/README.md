# Worker Shared Memory

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/worker/04_memory/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own shared-memory provider authority: buffer identity, the addressed layout contract, role-granted typed views, the atomic discipline, generation relationships, closure, and disposal.

## Owns

- The buffer resource: caller-carried exact identity, addressed layout, declared atomic discipline, owned lifecycle. The construction request names the fresh buffer identity, so the buffer the provider actually returns is exact — the public path and the lawful path are the same path.
- Role-granted views, correlated to the exact buffer and exact role — a writer view on buffer A structurally cannot claim buffer B or reader authority, and the constructed buffer's identity flows into the view relation without a broad hop.
- The atomic-discipline vocabulary: acquire-release or sequentially-consistent, declared per buffer.

## Does not own

- Semantic state or a second memory planner — core memory plans and execution images are consumed, not restated.
- Ring protocols' queue semantics — `05_queue`. No compositor or evaluator logic lives in a layout.
- Isolation headers a deployment may require for shared memory — that is a prerequisite of the selected realization, recorded at a downstream composition point, never a sibling import.

## The layout is addressed

Sizes, planes, offsets, and padding live behind one `SharedMemoryLayoutAddress`. The architecture never writes those numbers into declarations — that the physical bytes agree with the addressed contract is a `system/assurance` obligation, and the exact capacities are empirical.

## Laws

- A view pins its exact buffer and role; grants are correlated through the provider's generic operation.
- Construction is layout- and identity-correlated: requesting layout A under buffer identity A yields a buffer of exactly that layout and identity — the request and the returned buffer name one world, the buffer's `id` is the exact reference the view relation consumes, and the physical byte agreement (which allocation answers to the identity) stays `system/assurance`.
- A buffer carries its addressed layout, its atomic discipline, and an owned lifecycle.
- The atomic arms are exactly the declared disciplines.

## Proof obligations

- Physical layout bytes agree with the addressed layout contract.
- Atomic-order correctness holds at runtime; disposal happens exactly once.

Both are `system/assurance`; capacity, padding, and wait policy are empirical lanes.

## Implementation boundary

Specified with physical profiles deferred. No SharedArrayBuffer, view, or atomics code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/worker/04_memory
  title: "Worker Shared Memory"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - views-are-buffer-and-role-correlated
  - buffer-identity-caller-carried-through-construction
  - layouts-are-content-addressed-never-inlined
  - atomic-discipline-declared-per-buffer
  empirical_contracts:
  - buffer-capacities
  - padding-and-alignment
  - wait-and-notification-policy
  production_authority: false
```
