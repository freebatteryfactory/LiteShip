# Scenes, Spatial Coordinates, and Timelines

Status: specified hypothesis; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `11_scene/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Define target-neutral scene meaning, typed coordinate spaces, ordered transforms, hierarchy, geometry, materials, timelines, state and event tracks, subscenes, scene patches, and extension contracts.

## Owns

- Scene, entity, geometry, material, timeline, key, point, and subscene identity.
- Coordinate-space definitions and typed points, vectors, and transforms.
- Exact or tolerant spatial projections.
- Hierarchy and addressed subscene composition.
- Standard geometry, path commands, bounds, materials, and blend semantics.
- Value, state, event, and driver timeline tracks.
- Scene family changes and patches.
- Scene-specific projection and fallback declarations.

## Does not own

- DOM, SVG, Canvas, WebGPU, video, or renderer APIs.
- ECS storage as authoring ontology.
- Render-graph implementation.
- A second interpolation or easing system.
- Media clocks or host device acquisition.

## Spatial-coordinate decision

Scene space follows the same discipline as temporal coordinates: distinct coordinate systems cannot be interchanged without an explicit projection. It uses a dedicated spatial algebra rather than literally reusing temporal ordering, because spatial projections additionally require dimension, axes, handedness, units, origin, transform composition, invertibility, and loss policy.

A coordinate-space definition declares:

- dimension;
- axis directions;
- handedness where applicable;
- units;
- optional parent space;
- one `toParent` transform that defines this space's origin and basis in the parent.

Origin is not duplicated as an independently editable field. The parent transform is its authority.

Standard presets cover screen 2D, Cartesian 2D, world 3D, normalized device coordinates, local entity space, and media pixel space. Applications may define additional spaces through the same contract.

`SpatialTransform<From, To>` is ordered and typed. A value in one space cannot be supplied where another is required without a declared transform or projection.

## Geometry and materials

The paved-road geometry algebra includes established shapes and paths. A geometry kind earns paved-road support only when it declares:

- bounds;
- transform behavior;
- per-egress exactness, tolerance, and fallback;
- interpolation support or explicit refusal;
- canonical encoding.

Every coordinate-bearing geometry value and bound retains its declared coordinate-space type, so screen-space points cannot silently enter world-space geometry. Opaque geometry remains an expert extension. It cannot claim animation or egress support it has not implemented and proved.

Materials use explicit target-neutral color spaces, established blend modes, and ordinary terms such as fill, stroke, opacity, texture or media source, filter/effect, and shader reference. Target-specific shader code remains a compiler input or expert extension.

## Timeline and interpolation

Timelines use the established media concepts `Timebase` and `Timecode`. Authoring may use seconds, frames, samples, beats, or simulation steps when the timeline declares how they project.

Track families remain distinct:

- value tracks bind one persistent scene entity and one schema-derived field, then reconstruct values through the shared quantization interpolator authority;
- state tracks bind one persistent scene entity and one schema-derived field, then choose named states;
- event tracks invoke or propose operations at coordinates;
- driver tracks bind evidence or other semantic sources to one persistent scene entity and schema-derived field.

A `FieldReference` identifies a location in a schema. It does not identify which scene instance owns the value. Every field-writing track therefore uses the shared `EntityFieldReference` product. Two entities that share one component schema remain distinct timeline targets.

Scene never accepts `easing?: string`. It references `InterpolatorReference` from `09_quantization/`, so CSS, shader, scene, and video projections share one implementation law.

## Scene realization

Authors manipulate declarative scene meaning. Compilation may lower it into:

- revisioned world state;
- dense ECS planes;
- residual programs;
- render plans;
- CSS or DOM/SVG projections;
- GLSL or WGSL programs;
- video and audio schedules;
- editor and agent projections.

A subscene is an addressed semantic world instance with local coordinates, local time, declared ports, persistent identity, lifecycle, and explicit parent transaction. The compiler may inline, instance, isolate, cache, or separately schedule it.

## Laws

- Scene meaning is renderer-neutral.
- Coordinate conversion is explicit, typed, and exact or tolerance-labelled.
- Transform order is semantic and cannot be reordered silently.
- Hierarchy cannot create prohibited cycles.
- Every value, state, and driver track identifies both the persistent entity and its schema-derived field.
- Scene interpolation references the one quantization interpolator owner.
- Geometry support is capability-declared and proof-backed.
- Subscenes cannot attach without compatible declared space, time, and ports.
- Scene patches target persistent identities and exact revisions.
- Authored semantic changes must alter relevant pixels, structure, accessibility, or other declared egresses.

## Operation vocabulary

- `defineScene`, `defineCoordinateSpace`, `defineGeometry`, `defineMaterial`, and `defineTimeline` declare meaning.
- `project` converts between declared coordinate spaces or egresses.
- `sample` evaluates tracks at a timecode.
- `apply` applies a scene patch.
- `compile` lowers scene meaning.
- `render` remains a host operation over compiled output.
- `inspect` and `explain` expose hierarchy, spaces, tracks, settlement, and egress support.

## Proof obligations

- Cross-space coordinate and geometry assignment, plus raw string interpolators, fail type fixtures.
- A timeline field track without a persistent entity fails its type fixture; two entities sharing one schema remain independently targetable.
- Transform composition and inverse laws where invertible.
- Explicit refusal for inexact projections exceeding tolerance.
- Hierarchy, reparenting, and subscene attachment safety.
- Path normalization and interpolation.
- One transition program reaches CSS, shader uniforms, scene values, and video samples through one interpolator authority.
- Multi-egress scene fidelity.
- Realtime/offline timeline agreement.
- Scene patch round-trip and stale-base refusal.
- Authored scene differences produce meaningful output differences.

## Implementation boundary

The scene roster, coordinate and transform contracts, geometry-support predicate, timeline families, shared interpolation ownership, subscene model, and patch family are specified. This is the only major core area with no mature old spatial algebra to port.

## Remaining work

The spatial contract is a specified clean-room hypothesis and must be pressure-tested with SVG, CSS, Canvas, WebGPU, video, editor, and accessibility fixtures before production authority. Exact standard geometry and material constructor spelling may refine under those proofs without reopening the laws above.

## Machine-checkable projection

```yaml
home:
  path: 00_core/11_scene
  title: "Scenes, Spatial Coordinates, and Timelines"
  maturity: specified-hypothesis
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - renderer-neutral-scene-meaning
  - dedicated-typed-spatial-coordinate-algebra
  - explicit-exact-or-tolerant-space-projection
  - ordered-transform-composition
  - parent-transform-owns-origin-and-basis
  - timeline-field-tracks-bind-entity-and-schema-field
  - geometry-support-requires-bounds-transform-egress-and-interpolation
  - one-interpolator-authority
  - addressed-subscenes
  highest_risk_proof_area: spatial-algebra
  production_authority: false
```
