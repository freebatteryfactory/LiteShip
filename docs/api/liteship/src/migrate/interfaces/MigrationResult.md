[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/migrate](../README.md) / MigrationResult

# Interface: MigrationResult

Defined in: compiler/dist/migrate/types.d.ts:40

The result of a migration adapter — the produced definitions plus every
diagnostic emitted while producing them. The definition arrays are the real
`@liteship/core` runtime handles (`defineBoundary`/`defineToken`/`defineTheme`
outputs), already validated by their constructors.

## Properties

### boundaries

> `readonly` **boundaries**: readonly [`Boundary`](../../type-aliases/Boundary.md)[]

Defined in: compiler/dist/migrate/types.d.ts:41

***

### diagnostics

> `readonly` **diagnostics**: readonly [`MigrationDiagnostic`](MigrationDiagnostic.md)[]

Defined in: compiler/dist/migrate/types.d.ts:44

***

### themes

> `readonly` **themes**: readonly [`Theme`](../../type-aliases/Theme.md)[]

Defined in: compiler/dist/migrate/types.d.ts:43

***

### tokens

> `readonly` **tokens**: readonly [`Token`](../../type-aliases/Token.md)[]

Defined in: compiler/dist/migrate/types.d.ts:42
