[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/migrate](../README.md) / MigrationDiagnostic

# Interface: MigrationDiagnostic

Defined in: compiler/dist/migrate/types.d.ts:22

One migration diagnostic — the lightweight record the adapters accumulate.

Deliberately NOT the gauntlet `Finding` (which carries assurance-level /
coverage-class semantics and would force a `@liteship/gauntlet` dep onto the
compiler). Compiler deps stay `@liteship/core` + `@liteship/error` only.

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: compiler/dist/migrate/types.d.ts:32

The originating error/value, when the diagnostic wraps a caught throw or decode issue.

***

### code

> `readonly` **code**: `DiagnosticCodeFor`\<`"migrate"`\>

Defined in: compiler/dist/migrate/types.d.ts:24

A `migrate/…` code enrolled in the `@liteship/error` DIAGNOSTIC_REGISTRY.

***

### message

> `readonly` **message**: `string`

Defined in: compiler/dist/migrate/types.d.ts:26

Human/agent-readable summary of what happened at this source location.

***

### path?

> `readonly` `optional` **path?**: readonly (`string` \| `number`)[]

Defined in: compiler/dist/migrate/types.d.ts:28

Source location — a selector chain, token path, or feature name.

***

### severity

> `readonly` **severity**: `"error"` \| `"warning"`

Defined in: compiler/dist/migrate/types.d.ts:30

`warning` = lossy-but-usable; `error` = the source could not be represented and was dropped.
