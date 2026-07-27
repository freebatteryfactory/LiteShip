[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/migrate](../README.md) / MIGRATE\_CODES

# Variable: MIGRATE\_CODES

> `const` **MIGRATE\_CODES**: `Readonly`\<\{ `ambiguousBreakpoint`: `"migrate/ambiguous-breakpoint"`; `incompleteThemeVariant`: `"migrate/incomplete-theme-variant"`; `lossyTokenConversion`: `"migrate/lossy-token-conversion"`; `malformedInput`: `"migrate/malformed-input"`; `nonAscendingThresholds`: `"migrate/non-ascending-thresholds"`; `unknownTokenCategory`: `"migrate/unknown-token-category"`; `unmappableMediaFeature`: `"migrate/unmappable-media-feature"`; `unsupportedAtRule`: `"migrate/unsupported-at-rule"`; `unsupportedSelector`: `"migrate/unsupported-selector"`; \}\>

Defined in: compiler/dist/migrate/diagnostics.d.ts:18

The nine pinned `migrate/*` diagnostic codes, frozen. Each is a typed
`DiagnosticCode` literal and is enrolled (verbatim) in the
`@liteship/error` DIAGNOSTIC_REGISTRY under the `migrate` area.
