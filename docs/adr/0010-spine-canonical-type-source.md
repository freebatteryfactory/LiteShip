# ADR-0010: Spine as Canonical Type Source

**Status:** Accepted
**Date:** 2026-04-23

## Context

`packages/_spine/` contains 17 `.d.ts` files (4,776 lines at this revision) with shared declaration contracts for the package fleet. Before this ADR, branded types were duplicated between `_spine` and implementation packages. The package remains install-only: its only JavaScript is a throwing teaching stub for accidental value imports.

The capsule factory needs a canonical type source. Declaring capsule contracts that themselves duplicate types across `_spine` and implementation packages would inherit the duplication.

## Decision

- `_spine` becomes the single source of truth for branded types (`SignalInput`, `ThresholdValue`, `StateName`, `ContentAddress`, `TokenRef`, `Millis`, and future additions).
- Implementation packages (starting with `packages/core/src/schema/brands.ts`) re-anchor shared types from `_spine` via `import type` aliases and keep their runtime constructors locally.
- `CapsuleContract` imports shared structural types such as `ContentAddress` from `@liteship/_spine/core`.
- `TypeValidator` in `packages/core/src/authoring/capsule.ts` performs a synchronous strict kernel decode and returns the kernel `Result`; it does not depend on Effect.
- `_spine` is referenced from the root project graph and `vitest.shared.ts` aliases (`'@liteship/_spine'` → `packages/_spine/index.d.ts`).
- `packages/core/tsconfig.json` maps `@liteship/_spine` to the declaration barrel for composite builds.
- The root barrel and `SYMBOLS.md` are generated from the 16 declaration leaves. Only documented symbols with type meaning and one unambiguous leaf owner are admitted; value-only leaf declarations cannot become a root runtime promise.

## Consequences

- Eliminates 100% type duplication. Types change in one place.
- Runtime validation bridges contracts to implementation. `_spine` stops being documentation-only.
- Future contributors have one authoritative type location.
- `_spine` participates in builds, explicit surface generation, relation checks, and packed declaration tests, so drift is caught before release.
- Branded-type additions now land in `_spine/core.d.ts` (or the appropriate `_spine/*.d.ts` file) BEFORE the implementation package re-exports them. The ADR enforces the order to keep the bridge honest.

## Supporting evidence

- `packages/core/src/schema/brands.ts`: re-anchor pattern for the shared branded types.
- `packages/core/src/authoring/capsule.ts`: `ContentAddress` import from `@liteship/_spine/core`; `TypeValidator.validate` uses the synchronous schema kernel.
- `tsconfig.json` references include `./packages/_spine` as the first entry.
- `vitest.shared.ts` alias: `'@liteship/_spine': resolve(repoRoot, 'packages/_spine/index.d.ts')`.
- `packages/_spine/core.d.ts`: `Millis` added here (was absent before this ADR shipped) to unblock the `brands.ts` re-export.
- `scripts/gen-spine-surface.ts`: exact named barrel and symbol-documentation projection with planted collision, value-leak, and missing-documentation controls.

## References

- `docs/adr/0008-capsule-assembly-catalog.md` (paired factory ADR)
