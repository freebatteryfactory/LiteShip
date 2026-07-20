[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / DiagnosticArea

# Type Alias: DiagnosticArea

> **DiagnosticArea** = `"gauntlet"` \| `"check"` \| `"core"` \| `"schema"` \| `"compiler"` \| `"astro"` \| `"cli"` \| `"migrate"`

Defined in: [error/src/codes.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L40)

The AREA a diagnostic belongs to — the first `/`-separated segment of every
[DiagnosticCode](DiagnosticCode.md). It names the SUBSYSTEM that owns the code:
- `gauntlet`  — a gauntlet gate `Finding` ruleId (the fitness-function layer).
- `check`     — a P11 `check/<slug>` id (the data-driven check registry).
- `core`      — an `@liteship/core` runtime diagnostic (a `Diagnostics.warn/error` code).
- `schema`    — a schema/decode diagnostic.
- `compiler`  — a compile-pipeline diagnostic.
- `astro`     — an Astro-integration diagnostic.
- `cli`       — a CLI-surface diagnostic.
- `migrate`   — a migration/codemod diagnostic.
