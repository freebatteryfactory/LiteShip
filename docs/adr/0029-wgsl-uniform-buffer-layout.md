# ADR-0029 — WGSL uniform buffer layout is declaration-derived, not a fixed scalar block

**Status:** Accepted
**Date:** 2026-07-01

## Context

The WebGPU runtime wrote boundary uniforms into a fixed, flat scalar block — a
handful of `f32`/`u32` slots (`state_index`, `u_time`, a scalar-only `u_resolution`).
A boundary uniform could therefore only ever be a scalar. A `vec2<f32>` — the
canonical case being `u_resolution` for aspect-correct raymarching and any
resolution-dependent shader — could not be expressed: GLSL carried it, WGSL
silently truncated it to a scalar. A silent GLSL/WGSL parity gap, exactly the
degradation class the make-it-loud program exists to remove.

The value also has to survive a long delivery chain — authored `@wgsl` value →
`@czap/compiler` emit → Vite `@wgsl` manifest → edge KV cache → satellite payload →
boundary event `detail` → the WebGPU buffer writer. Every hop was scalar-shaped;
each would have dropped or flattened a vector even if the runtime could hold one.

## Decision

The WGSL runtime derives its uniform-buffer byte layout from the bound
`@group(0) @binding(0) var<uniform>` struct declaration. Fields are written in
declaration order under WGSL uniform alignment — scalar → 4 bytes, `vec2<f32>` →
8 bytes, `vec3<f32>`/`vec4<f32>` → 16 bytes — and the buffer size is rounded to a
16-byte stride. The layout is a function of the declaration, so an author cannot
land a silently-wrong offset.

`@czap/compiler` emits WGSL scalar / `vec2f` / `vec3f` / `vec4f` fields, inferred
from authored `@wgsl` values (`number | vec2 | vec3 | vec4`). The manifest, edge
cache, satellite payload, boundary event `detail`, and the WebGPU writer preserve
the same scalar-or-vector value shape end to end — one value shape, one path, no
scalar-only narrowing at any hop.

The runtime buffer is bounded (64 bytes). When a declared field would overflow it,
the runtime emits `wgsl-uniform-buffer-full` through `Diagnostics.warnOnce` — an
overflow is named and located, never a silent truncation.

## Consequences

- `vec2`/`vec3`/`vec4` WGSL uniforms work; the GLSL/WGSL parity gap is closed, and
  `u_resolution` is a real `vec2<f32>`.
- The byte layout is declaration-derived by construction and pinned by test:
  `u32 @0`, `vec2 @8`, `vec3 @16`, `vec4 @32`, in a 64-byte buffer. A wrong offset
  reds the layout gate rather than mis-rendering silently on a real GPU.
- The scalar-or-vector value shape is preserved across compiler → manifest → KV →
  payload → `detail` → writer; a dropped or flattened vector reds the owning seam's
  gate.
- **make-it-loud:** a uniform-buffer overflow is a named `warnOnce`, not a silent
  drop of the offending field.
- **Bounded:** the runtime buffer is a deliberate fixed 64 bytes (consistent with
  the zero-alloc / bounded hot-path discipline); declarations beyond it warn at the
  boundary instead of growing the runtime unboundedly.
- Additive: the buffer widened 32 → 64 bytes and WGSL emit gained vector types;
  authored scalars are unchanged. Pre-1.0 minor.

## Evidence

- `packages/compiler/src/wgsl.ts` — scalar/`vec2f`/`vec3f`/`vec4f` inference + emit; `packages/compiler/src/dispatch.ts` routes WGSL as a cast target.
- `packages/vite/src/boundary-manifest.ts` — `@wgsl` manifest parse preserves `vec2f(...)`/`vec3f(...)`/`vec4f(...)` values.
- `packages/edge/src/kv-cache.ts` — KV rehydrate preserves vector binding values (JSON arrays), not scalar-narrowed.
- `packages/astro/src/runtime/wgpu.ts` — declaration-derived byte layout, 64-byte bounded buffer, `wgsl-uniform-buffer-full` `warnOnce`; `boundary.ts` / `worker.ts` / `inspector-panels.ts` / `Satellite.ts` carry the vector value shape.
- `tests/unit/compiler/wgsl-compiler.test.ts`, `tests/unit/vite/boundary-manifest.test.ts`, `tests/unit/edge/kv-cache.test.ts`, `tests/unit/astro/wgpu-runtime.test.ts`, `tests/integration/wgsl-cast.test.ts` — 5 files / 87 tests. Non-vacuous: breaking each seam (compiler inference, manifest parse, KV rehydrate, byte layout) reds its matching gate.

## Rejected alternatives

- **Keep the fixed scalar block, document "WGSL uniforms are scalar-only."** Documents the parity gap instead of closing it — leaves GLSL ahead of WGSL and silently truncates a declared `vec`. Fails the make-it-loud bar.
- **Grow the uniform buffer dynamically to fit any declaration.** Violates the bounded hot-path discipline ([ADR-0002](./0002-zero-alloc.md)); a fixed 64-byte buffer with a loud overflow warning is the bounded seam.
- **Maintain a per-field layout table beside the shader.** A hand-written mirror of the struct declaration that drifts on edit — deriving the layout from the declaration makes a wrong offset unrepresentable, the same source-of-truth move as the rest of this release.
- **A separate vector-only delivery path parallel to the scalar path.** Two code paths for one concept; carrying a unified scalar-or-vector value shape end to end is one path and one set of seam gates.

## References

- [ADR-0002](./0002-zero-alloc.md) — bounded, zero-allocation hot path (the fixed buffer + loud overflow).
- [ADR-0006](./0006-compiler-dispatch.md) — compiler dispatch tagged union (WGSL is one cast target).
- [ADR-0028](./0028-plain-element-directive-scanner.md) — sibling make-it-loud-round-2 decision (loud-not-silent, source-of-truth derivation).
