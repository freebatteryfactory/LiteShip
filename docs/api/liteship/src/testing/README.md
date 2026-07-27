[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / liteship/src/testing

# liteship/src/testing

`liteship/testing` — the curated test-only facade over
`@liteship/core/harness` (the per-arm generators that emit test + bench + audit
files from a capsule declaration). Partitioned off the root so a consumer cannot
reach these by importing `liteship` directly. Curated named re-exports only — no
behavior lives here.

## Namespaces

- [ArbitraryFromSchema](namespaces/ArbitraryFromSchema/README.md)

## Interfaces

- [HarnessContext](interfaces/HarnessContext.md)
- [HarnessOutput](interfaces/HarnessOutput.md)
- [SceneDriver](interfaces/SceneDriver.md)

## Type Aliases

- [HarnessLane](type-aliases/HarnessLane.md)
- [SceneCheckDisposition](type-aliases/SceneCheckDisposition.md)
- [SiteAdapterCheckDisposition](type-aliases/SiteAdapterCheckDisposition.md)
- [SiteAdapterDriver](type-aliases/SiteAdapterDriver.md)

## Variables

- [ArbitraryFromSchema](variables/ArbitraryFromSchema.md)
- [BENCH\_NOT\_APPLICABLE\_MARKER](variables/BENCH_NOT_APPLICABLE_MARKER.md)
- [BENCH\_NOT\_APPLICABLE\_RE](variables/BENCH_NOT_APPLICABLE_RE.md)
- [SCENE\_CHECKS](variables/SCENE_CHECKS.md)
- [schemaToArbitrary](variables/schemaToArbitrary.md)
- [SITE\_ADAPTER\_CHECKS](variables/SITE_ADAPTER_CHECKS.md)

## Functions

- [benchHonestyError](functions/benchHonestyError.md)
- [benchNotApplicableMarker](functions/benchNotApplicableMarker.md)
- [classifyBenchSource](functions/classifyBenchSource.md)
- [generateCachedProjection](functions/generateCachedProjection.md)
- [generatePolicyGate](functions/generatePolicyGate.md)
- [generatePureTransform](functions/generatePureTransform.md)
- [generateReceiptedMutation](functions/generateReceiptedMutation.md)
- [generateSceneComposition](functions/generateSceneComposition.md)
- [generateSiteAdapter](functions/generateSiteAdapter.md)
- [generateStateMachine](functions/generateStateMachine.md)

## References

### LITESHIP\_PACKAGES

Re-exports [LITESHIP_PACKAGES](../package-roster.generated/variables/LITESHIP_PACKAGES.md)

***

### LiteshipPackageName

Re-exports [LiteshipPackageName](../package-roster.generated/type-aliases/LiteshipPackageName.md)
