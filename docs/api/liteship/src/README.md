[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / liteship/src

# liteship/src

`liteship` — the curated facade for the LiteShip stack.

Installing `liteship` still brings every publishable `@liteship/*` package into
your node_modules in one dependency (the umbrella role is unchanged). What is new
is the CURATED FACADE: this root `.` entry exposes a small, budgeted authoring
surface — immutable `define*` authoring, `schema`, and diagnostic inspection.
Stateful reactive/motion allocation, tiers, receipts, testing, and fleet
metadata live on explicit expert subpaths. The deeper domain surfaces ride
(`liteship/schema`, `liteship/reactive`, `liteship/motion`, `liteship/graph`,
`liteship/media`, `liteship/evidence`, `liteship/compiler`, `liteship/runtime`,
`liteship/astro`, `liteship/vite`, `liteship/testing`, `liteship/migrate`,
`liteship/genui`).

The root is DELIBERATELY minimal and host-integration-free: importing `.`
evaluates the pure core/quantizer/compiler owners needed to make the flagship
`defineAdaptive(...).plan()` route complete, but NOTHING from host integrations
(`@liteship/astro`, `@liteship/vite`) — those carry host-specific (optional)
peer expectations and live behind independent subpaths. The permitted root surface is
pinned as DATA in `export-budget.ts` and enforced by the
`gauntlet/facade-export-budget` gate. You can still import from the individual
scopes (`@liteship/core`, `@liteship/quantizer`, …) exactly as the docs show.

## Interfaces

- [Adaptive](interfaces/Adaptive.md)
- [Config](interfaces/Config.md)
- [Quantizer](interfaces/Quantizer.md)

## Type Aliases

- [Boundary](type-aliases/Boundary.md)
- [Boundary](type-aliases/Boundary-1.md)
- [Config](type-aliases/Config.md)
- [Style](type-aliases/Style.md)
- [Style](type-aliases/Style-1.md)
- [Theme](type-aliases/Theme.md)
- [Theme](type-aliases/Theme-1.md)
- [Token](type-aliases/Token.md)
- [Token](type-aliases/Token-1.md)

## Variables

- [schema](variables/schema.md)

## Functions

- [defineBoundary](functions/defineBoundary.md)
- [defineConfig](functions/defineConfig.md)
- [defineQuantizer](functions/defineQuantizer.md)
- [defineStyle](functions/defineStyle.md)
- [defineTheme](functions/defineTheme.md)
- [defineToken](functions/defineToken.md)
- [explainDiagnostic](functions/explainDiagnostic.md)

## References

### defineAdaptive

Re-exports [defineAdaptive](authoring/adaptive/functions/defineAdaptive.md)

***

### DiagnosticCode

Re-exports [DiagnosticCode](evidence/type-aliases/DiagnosticCode.md)
