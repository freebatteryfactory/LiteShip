[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AIConstraint

# Interface: AIConstraint

Defined in: compiler/dist/ai-manifest.d.ts:80

Cross-cutting invariant declared alongside the manifest.

`condition` is opaque at the type level — hosts evaluate it in their own
constraint engine (e.g. a `Plan` predicate). `message` is what the
LLM sees when the constraint is reported as violated.

## Properties

### condition

> `readonly` **condition**: `unknown`

Defined in: compiler/dist/ai-manifest.d.ts:84

Host-defined condition payload (opaque at this layer).

***

### id

> `readonly` **id**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:82

Stable identifier for diagnostics and citation.

***

### message

> `readonly` **message**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:86

Human-readable message for violation reports.
