[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / DIAGNOSTIC\_AREAS

# Variable: DIAGNOSTIC\_AREAS

> `const` **DIAGNOSTIC\_AREAS**: readonly \[`"gauntlet"`, `"check"`, `"error"`, `"core"`, `"schema"`, `"audit"`, `"compiler"`, `"detect"`, `"genui"`, `"astro"`, `"cli"`, `"migrate"`\]

Defined in: [error/src/codes.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L42)

The AREA a diagnostic belongs to — the first `/`-separated segment of every
[DiagnosticCode](../type-aliases/DiagnosticCode.md). It names the SUBSYSTEM that owns the code:
- `gauntlet`  — a gauntlet gate `Finding` ruleId (the fitness-function layer).
- `check`     — a P11 `check/<slug>` id (the data-driven check registry).
- `core`      — an `@liteship/core` runtime diagnostic (a `Diagnostics.warn/error` code).
- `schema`    — a schema/decode diagnostic.
- `audit`     — a repository/consumer audit finding rule.
- `compiler`  — a compile-pipeline diagnostic.
- `detect`    — a device-capability detection diagnostic.
- `astro`     — an Astro-integration diagnostic.
- `cli`       — a CLI-surface diagnostic.
- `migrate`   — a migration/codemod diagnostic.
