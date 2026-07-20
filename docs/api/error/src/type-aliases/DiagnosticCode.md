[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / DiagnosticCode

# Type Alias: DiagnosticCode

> **DiagnosticCode** = `` `${DiagnosticArea}/${string}` ``

Defined in: [error/src/codes.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L47)

A stable diagnostic code — `${DiagnosticArea}/${string}`. The area is the first
segment; the remainder is the emitter's own slug kept VERBATIM (it may contain
further `/` for sub-codes, e.g. `gauntlet/traceability/untraced`).
