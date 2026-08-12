# Quantization and Reconstruction

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `09_quantization/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own continuous-to-discrete named-state quantization, hysteresis, crossings, interpolation identity, reconstruction, blending, quality policies, and target-neutral projected values.

## Owns

- Boundaries and ordered named states.
- Quantizer definitions and evaluated state.
- Hysteresis and crossing semantics.
- Interpolator definitions and references.
- Reconstruction between state endpoints and progress.
- Blend weights and transition programs.
- Quality-policy invariants.

## Does not own

- Browser evidence acquisition.
- Scene-specific timeline syntax.
- CSS, GLSL, WGSL, ARIA, or media emission.
- Backend selection or settlement.
- A second scene-local easing vocabulary.

## Shared interpolation contract

Interpolation and easing have one core owner here. Scene timeline keys, quantizer reconstruction, CSS motion, shader uniforms, scene values, and video samples reference the same `InterpolatorReference` and implementation law.

A scene may define where and when values change. It does not redefine how a named interpolator behaves.

## Laws

- Boundaries have nonempty ordered states and strictly ordered thresholds.
- Hysteresis prevents flapping without inventing state.
- One input and prior state produce one deterministic result under the declared numeric contract.
- Reconstruction is explicit: endpoints plus progress produce a value.
- Interpolator identity is typed and content-addressable; raw strings do not satisfy it.
- Quality may remove optional richness but never truth, security, authority, accessibility, or required interaction.
- One quantizer may project to several egresses without separate semantic implementations.

## Operation vocabulary

- `defineBoundary`, `defineQuantizer`, and `defineInterpolator` declare immutable meaning.
- `evaluate` resolves a named state.
- `reconstruct` produces an intermediate value.
- `sample` evaluates a transition at an explicit coordinate.
- `project` belongs to downstream compilers.

## Proof obligations

- Threshold and hysteresis boundary tests.
- Batch/reference numeric parity.
- One interpolator projects consistently to CSS, shader uniforms, scene values, and video samples.
- Raw string interpolators fail type fixtures.
- Quality invariants survive every tier.
- Equal quantizer definitions have stable addresses.
- Static quantizers settle with zero residual runtime when all requirements are satisfied earlier.

## Implementation boundary

The quantization and interpolation semantics are specified. Runtime, compiler projections, numeric kernels, and authoring values are absent.

Porting the mature boundary behaviour, defining the standard interpolator catalogue, and qualifying numerical parity across TypeScript, Rust, Wasm, and GPU projections are implementation obligations this architecture already authorizes.

## Machine-checkable projection

```yaml
home:
  path: 00_core/09_quantization
  title: "Quantization and Reconstruction"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - named-state-quantization
  - one-interpolation-owner
  - reconstruction-is-endpoints-plus-progress
  - quality-cannot-weaken-invariants
  production_authority: false
```
