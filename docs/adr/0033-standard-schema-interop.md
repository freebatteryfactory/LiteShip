# ADR-0033 — DocumentGraphNodeSchema carries Standard Schema V1

**Status:** Accepted
**Date:** 2026-07-04

## Context

LiteShip's one cross-boundary Effect Schema value is `DocumentGraphNodeSchema`: consumers use it to decide whether an unknown JSON-ish node is well formed before it becomes a graph node. Form validators, router integrations, and other host stacks increasingly understand Standard Schema V1, and `effect@4.0.0-beta.32` already exposes `Schema.toStandardSchemaV1`.

The gap was not worth a hand-written adapter. A second schema export would also force consumers to choose between "the Effect schema" and "the Standard Schema schema", creating drift at the one value that should stay canonical.

## Decision

Wrap the existing `DocumentGraphNodeSchema` definition with `Schema.toStandardSchemaV1` in place. The exported value remains the one canonical node schema and now carries the `~standard` interop property. `Schema.is` and `isWellFormedNode` continue to read the same value, so existing Effect consumers keep their behavior.

Add `@standard-schema/spec` as a dependency because the generated declaration surface references its types. LiteShip writes no Standard Schema conversion code; the Effect converter is the implementation.

## Consequences

- Standard-Schema-aware consumers can validate document graph nodes directly from LiteShip's canonical schema.
- Existing `Schema.is(DocumentGraphNodeSchema)` consumers keep working.
- No other surfaces convert in this wave. Command I/O and AI-cast tool surfaces are already plain JSON Schema (`ai-cast.ts` owns the tool schema), and adding a parallel `~standard` story there would be a separate decision.
- The compatibility test pins the Effect beta's runtime shape (`version`, `vendor`, async-capable `validate`) so a future Effect bump cannot silently break interop.

## Evidence

- `packages/core/src/document-graph-schema.ts` — in-place Standard Schema V1 wrapper.
- `packages/core/package.json` — `@standard-schema/spec` dependency.
- `tests/unit/core/standard-schema.test.ts` — vendor/version and validate success/failure pins.

## Rejected alternatives

- **Export `DocumentGraphNodeStandardSchema` beside the existing value.** This is the fallback if the in-place wrap stops typechecking, but it creates a choice point and another public name. The shipped implementation did not need it.
- **Hand-write a Standard Schema adapter.** Effect already supplies the converter and owns the correct issue shape.
- **Convert every schema-like surface.** The wave only covers the one Effect Schema value crossing package boundaries. Other command and AI surfaces already speak JSON Schema.

## References

- `packages/core/src/document-graph-schema.ts`
- `packages/core/src/ai-cast.ts` — JSON Schema tool-surface construction.
- [`@standard-schema/spec`](https://github.com/standard-schema/standard-schema)
